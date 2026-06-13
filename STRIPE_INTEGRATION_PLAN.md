# Plan integracji Stripe — Marketing Runner

## Kontekst

Aplikacja jest multi-tenant SaaS. Każdy klient ma rekord w tabeli `clients` (identyfikowany przez `slug`) oraz dane logowania w `clientAuth`. Dostęp do dashboardu jest chroniony przez JWT (middleware w `src/proxy.ts`). Logowanie blokuje konta z `status = 'suspended'`.

Sklep z subskrypcjami powstanie jako **osobna aplikacja**. Ta aplikacja ma tylko odbierać zdarzenia Stripe przez webhook i zarządzać dostępem klientów.

---

## Co trzeba zrobić

### 1. Instalacja paczki Stripe

```bash
npm install stripe
```

Dodać do `.env`:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

### 2. Migracja bazy danych — nowe kolumny w `clients`

**Plik:** `src/db/schema.ts`

Dodać 3 kolumny do tabeli `clients`:

```ts
stripeCustomerId: text('stripe_customer_id'),
stripeSubscriptionId: text('stripe_subscription_id'),
subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
```

Po zmianie uruchomić:
```bash
npm run db:push
```

**Dlaczego te kolumny:**
- `stripeCustomerId` — łączy rekord klienta ze Stripe, używany do matchowania przychodzących webhooków
- `stripeSubscriptionId` — potrzebny do pobierania szczegółów subskrypcji z API Stripe
- `subscriptionExpiresAt` — data do kiedy klient ma dostęp; ustawiana przez webhook, sprawdzana przy logowaniu

---

### 3. Nowy endpoint webhook — `/api/webhooks/stripe/route.ts`

**Plik:** `src/app/api/webhooks/stripe/route.ts` (nowy plik)

Endpoint obsługuje `POST` bez autoryzacji przez `x-agency-secret` — zamiast tego weryfikuje podpis Stripe (`stripe-signature` header + `STRIPE_WEBHOOK_SECRET`).

> **Ważne:** Stripe wymaga surowego body (nie sparsowanego JSON) do weryfikacji podpisu. Trzeba użyć `req.text()` przed `stripe.webhooks.constructEvent()`.

#### Obsługiwane zdarzenia:

---

#### `checkout.session.completed` (mode: subscription)

Wyzwalane gdy klient po raz pierwszy kupuje subskrypcję w sklepie.

Logika:
1. Sprawdź czy `session.mode === 'subscription'`
2. Pobierz `customer` (Stripe customer ID), `subscription` ID, email klienta
3. Pobierz obiekt subskrypcji z Stripe API → odczytaj `current_period_end`
4. Sprawdź czy w `clients` istnieje już rekord z tym `stripeCustomerId`
   - **Jeśli tak** (reaktywacja): ustaw `status = 'active'`, zaktualizuj `stripeSubscriptionId` i `subscriptionExpiresAt`
   - **Jeśli nie** (nowe konto): utwórz konto
5. Tworzenie nowego konta:
   - Wygeneruj `slug` z emaila (np. `jan.kowalski@gmail.com` → `jankowalski` + 4 losowe znaki)
   - Wygeneruj losowe hasło
   - Zahashuj hasło bcryptem (10 rund)
   - Wstaw rekord do `clients` (status: 'active', stripeCustomerId, subscriptionExpiresAt)
   - Wstaw rekord do `clientAuth`
   - Wywołaj `vps.createClient(slug, name)` — tak samo jak w `/api/setup`
   - Jeśli VPS się nie powiedzie → rollback (usuń `clientAuth` i `clients`)
6. **TODO:** Wysłać email z danymi logowania (`slug` + hasło) — wymaga osobnej integracji (np. Resend/SendGrid)

---

#### `invoice.paid`

Wyzwalane przy każdej udanej płatności cyklicznej (co miesiąc).

Logika:
1. Pobierz `subscription` ID z faktury
2. Pobierz obiekt subskrypcji z Stripe API → odczytaj `current_period_end`
3. Zaktualizuj klienta z pasującym `stripeCustomerId`:
   - `status = 'active'`
   - `subscriptionExpiresAt = new Date(current_period_end * 1000)`

---

#### `customer.subscription.deleted`

Wyzwalane gdy subskrypcja zostaje anulowana (przez klienta lub przez Stripe po nieudanych płatnościach).

Logika:
1. Odczytaj `current_period_end` z obiektu subskrypcji — to jest data do której klient już zapłacił
2. Ustaw `subscriptionExpiresAt = new Date(current_period_end * 1000)`
3. **Nie zmieniaj `status`** — klient zachowuje dostęp do końca opłaconego okresu

> Efekt: klient może się logować do końca miesiąca za który zapłacił. Po tym czasie login automatycznie blokuje dostęp (patrz punkt 4).

---

#### `customer.subscription.updated`

Opcjonalne — logowanie gdy `status === 'past_due'` lub `'unpaid'`. Stripe sam spróbuje pobrać płatność kilka razy zanim wyśle `subscription.deleted`. Na tym etapie nie blokujemy dostępu.

---

### 4. Aktualizacja logiki logowania

**Plik:** `src/app/login/actions.ts`

Obecny check (linia 25):
```ts
if (client.status === 'suspended') {
  return { error: 'Konto zawieszone. Skontaktuj się z agencją.' }
}
```

Dodać po tym checku:
```ts
if (client.subscriptionExpiresAt && client.subscriptionExpiresAt < new Date()) {
  return { error: 'Subskrypcja wygasła. Odnów dostęp w sklepie.' }
}
```

**Dlaczego osobny check zamiast zmiany statusu:**
- Konta tworzone ręcznie przez agencję (przez `/api/setup`) nie mają `subscriptionExpiresAt` — dla nich null oznacza "brak ograniczenia"
- Konta Stripe są blokowane automatycznie gdy minie `subscriptionExpiresAt`
- Nie potrzeba crona ani osobnego procesu — blokada dzieje się przy próbie logowania

---

### 5. Konfiguracja Stripe Dashboard

W panelu Stripe → Webhooks → dodaj endpoint:

```
https://twoja-domena.pl/api/webhooks/stripe
```

Zdarzenia do nasłuchiwania:
- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.deleted`
- `customer.subscription.updated` (opcjonalne)

---

## Kolejność implementacji

1. `npm install stripe`
2. Dodaj env vars do `.env` i Vercel
3. Zmień `src/db/schema.ts` → dodaj 3 kolumny
4. `npm run db:push`
5. Stwórz `src/app/api/webhooks/stripe/route.ts`
6. Zaktualizuj `src/app/login/actions.ts`
7. Przetestuj webhookiem testowym ze Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## Czego plan NIE obejmuje (TODO na przyszłość)

- **Wysyłka emaila z danymi logowania** — potrzebna integracja z Resend / SendGrid / innym providerem
- **Strona "subskrypcja wygasła"** zamiast komunikatu błędu na logowaniu
- **Panel klienta** do zarządzania subskrypcją (Stripe Customer Portal)
- **Logowanie zdarzeń Stripe** do bazy dla celów audytu
- **Obsługa refundów** (`charge.refunded`)
