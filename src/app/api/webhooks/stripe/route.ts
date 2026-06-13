import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { db } from '@/db'
import { clients } from '@/db/schema'
import { eq } from 'drizzle-orm'

function periodEndFromSubscription(sub: Stripe.Subscription): Date {
  const item = sub.items.data[0]
  return new Date(item.current_period_end * 1000)
}

async function sendOnboardingEmail(resend: Resend, email: string, sessionId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const link = `${appUrl}/onboarding?session_id=${sessionId}`
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: 'Skonfiguruj swoje konto',
    html: `<p>Dziękujemy za zakup! Kliknij poniższy link, aby skonfigurować swoje konto:</p><p><a href="${link}">${link}</a></p><p>Link jest jednorazowy.</p>`,
  })
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[stripe webhook] signature verification failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
        const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
        const email = session.customer_details?.email ?? session.customer_email

        if (!stripeCustomerId || !stripeSubscriptionId) break

        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
        const expiresAt = periodEndFromSubscription(subscription)

        const existing = await db.select().from(clients).where(eq(clients.stripeCustomerId, stripeCustomerId)).limit(1)

        if (existing.length > 0) {
          const client = existing[0]

          if (client.onboardingCompletedAt !== null) {
            // Reaktywacja po przerwie
            await db.update(clients)
              .set({ status: 'active', stripeSubscriptionId, subscriptionExpiresAt: expiresAt })
              .where(eq(clients.stripeCustomerId, stripeCustomerId))
            if (email) {
              await resend.emails.send({
                from: process.env.EMAIL_FROM!,
                to: email,
                subject: 'Twoja subskrypcja została odnowiona',
                html: `<p>Twoja subskrypcja została odnowiona. Możesz teraz zalogować się na swoje konto.</p>`,
              })
            }
          } else {
            // Pending rekord już istnieje — wyślij link onboardingowy ponownie
            if (email) {
              await sendOnboardingEmail(resend, email, session.id)
            }
          }
          break
        }

        // Nowe konto — wstaw pending rekord
        if (!email) {
          console.error('[stripe webhook] checkout.session.completed: brak emaila')
          break
        }

        await db.insert(clients).values({
          slug: null,
          name: email,
          email,
          status: 'active',
          config: {},
          stripeCustomerId,
          stripeSubscriptionId,
          subscriptionExpiresAt: expiresAt,
          onboardingCompletedAt: null,
        })

        await sendOnboardingEmail(resend, email, session.id)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

        const parent = invoice.parent as (Stripe.Invoice.Parent & { subscription_details?: { subscription?: string | Stripe.Subscription } }) | null
        const rawSubId = parent?.subscription_details?.subscription
        const stripeSubscriptionId = typeof rawSubId === 'string' ? rawSubId : rawSubId?.id

        if (!stripeSubscriptionId || !stripeCustomerId) break

        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
        const expiresAt = periodEndFromSubscription(subscription)

        await db.update(clients)
          .set({ status: 'active', subscriptionExpiresAt: expiresAt })
          .where(eq(clients.stripeCustomerId, stripeCustomerId))
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer as Stripe.Customer | Stripe.DeletedCustomer)?.id
        const expiresAt = periodEndFromSubscription(subscription)

        if (!stripeCustomerId) break

        await db.update(clients)
          .set({ subscriptionExpiresAt: expiresAt })
          .where(eq(clients.stripeCustomerId, stripeCustomerId))
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
          console.log('[stripe webhook] subskrypcja zaległa:', subscription.id, subscription.status)
        }
        break
      }
    }
  } catch (err) {
    console.error('[stripe webhook] błąd obsługi zdarzenia', event.type, err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
