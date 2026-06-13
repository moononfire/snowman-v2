import { redirect } from 'next/navigation'
import Stripe from 'stripe'
import { db } from '@/db'
import { clients } from '@/db/schema'
import { eq } from 'drizzle-orm'
import OnboardingForm from './OnboardingForm'
import Link from 'next/link'

const wrapperCls = 'min-h-screen flex items-center justify-center'
const cardCls = 'p-8 rounded-lg shadow w-full max-w-sm border'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const { session_id } = await searchParams

  if (!session_id || typeof session_id !== 'string') {
    redirect('/login')
  }

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(session_id)
  } catch {
    return (
      <div className={wrapperCls} style={{ background: 'var(--background)' }}>
        <div className={`${cardCls} text-center`} style={{ background: 'var(--card)' }}>
          <h1 className="text-xl font-bold mb-4">Błąd</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Nie znaleziono sesji zakupu.</p>
        </div>
      </div>
    )
  }

  if (session.payment_status !== 'paid') {
    return (
      <div className={wrapperCls} style={{ background: 'var(--background)' }}>
        <div className={`${cardCls} text-center`} style={{ background: 'var(--card)' }}>
          <h1 className="text-xl font-bold mb-4">Płatność nieudana</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Nie znaleziono opłaconej sesji zakupu.</p>
        </div>
      </div>
    )
  }

  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  const email = session.customer_details?.email ?? session.customer_email ?? ''

  if (!stripeCustomerId) {
    return (
      <div className={wrapperCls} style={{ background: 'var(--background)' }}>
        <div className={`${cardCls} text-center`} style={{ background: 'var(--card)' }}>
          <h1 className="text-xl font-bold mb-4">Błąd</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Nie znaleziono danych klienta.</p>
        </div>
      </div>
    )
  }

  const clientRows = await db.select().from(clients).where(eq(clients.stripeCustomerId, stripeCustomerId)).limit(1)

  if (clientRows.length > 0 && clientRows[0].onboardingCompletedAt !== null) {
    return (
      <div className={wrapperCls} style={{ background: 'var(--background)' }}>
        <div className={`${cardCls} text-center`} style={{ background: 'var(--card)' }}>
          <h1 className="text-xl font-bold mb-4">Konto już aktywowane</h1>
          <p className="mb-6" style={{ color: 'var(--muted-foreground)' }}>Twoje konto zostało już skonfigurowane.</p>
          <Link href="/login" className="text-blue-600 hover:underline">Przejdź do logowania</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={wrapperCls} style={{ background: 'var(--background)' }}>
      <div className={cardCls} style={{ background: 'var(--card)' }}>
        <h1 className="text-2xl font-bold mb-2 text-center">Skonfiguruj konto</h1>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--muted-foreground)' }}>{email}</p>
        <OnboardingForm sessionId={session_id} email={email} />
      </div>
    </div>
  )
}
