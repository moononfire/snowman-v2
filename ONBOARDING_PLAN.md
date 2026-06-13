# Plan: Onboarding po zakupie Stripe + Reset hasła

## Kontekst i decyzje

- Klient sam wybiera slug i hasło po zakupie — brak losowych haseł wysyłanych emailem
- Stripe redirect po płatności trafia na `/onboarding?session_id=cs_xxx` (ten sam link wysyłamy też emailem przez Resend)
- Link jednorazowy — po ukończeniu onboardingu kolejne kliknięcia pokazują "konto już aktywowane"
- Email provider: **Resend**
- VPS to współdzielony worker — każdy klient musi być zarejestrowany (`vps.createClient`), ale robimy to dopiero w `/api/onboarding` gdy slug jest już finalny
- `slug` w tabeli `clients` zmienia się na nullable — pending rekord czeka bez sluga aż klient skończy onboarding

---

## 1. Zmiany schematu bazy danych

**Plik:** `src/db/schema.ts`

### Zmiana w tabeli `clients`

```ts
// slug: text('slug').unique().notNull(),  ← było
slug: text('slug').unique(),               // ← nullable: pending konta nie mają jeszcze sluga
onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
```

Semantyka `onboardingCompletedAt`:
- `null` → konto pending (zakup zrobiony, ale klient nie ustawił jeszcze sluga i hasła)
- wartość → konto aktywne

### Nowa tabela `passwordResetTokens`

```ts
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: text('id').primaryKey().default('gen_random_uuid()'),
  clientSlug: text('client_slug').notNull().references(() => clients.slug),
  token: text('token').unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

**Po zmianach:** `npm run db:push`

---

## 2. Nowe pakiety i zmienne środowiskowe

```bash
npm install resend
```

Dodać do `.env` i Vercel:
```
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@twoja-domena.pl
NEXT_PUBLIC_APP_URL=https://twoja-domena.pl
```

---

## 3. Zmiany w webhooku Stripe

**Plik:** `src/app/api/webhooks/stripe/route.ts`

### `checkout.session.completed` — nowa logika

1. Pobierz `stripeCustomerId`, `stripeSubscriptionId`, `email` z sesji Stripe
2. Pobierz subskrypcję → `subscriptionExpiresAt` z `subscription.items.data[0].current_period_end`
3. Sprawdź `clients` po `stripeCustomerId`:

   **Przypadek A — rekord istnieje i `onboardingCompletedAt` ustawione:**
   Reaktywacja po przerwie. Zaktualizuj `status='active'`, `stripeSubscriptionId`, `subscriptionExpiresAt`.
   Wyślij email "Twoja subskrypcja została odnowiona" (bez linku onboardingowego).

   **Przypadek B — rekord istnieje i `onboardingCompletedAt` null:**
   Poprzedni webhook już stworzył pending rekord (duplikat zdarzenia lub retry).
   Wyślij email z linkiem onboardingowym jeszcze raz (idempotentne).

   **Przypadek C — brak rekordu:**
   Wstaw pending rekord:
   ```ts
   db.insert(clients).values({
     slug: null,
     name: email,
     email,
     status: 'active',
     stripeCustomerId,
     stripeSubscriptionId,
     subscriptionExpiresAt: expiresAt,
     onboardingCompletedAt: null,
   })
   ```
   Wyślij email z linkiem onboardingowym.

4. Link w emailu: `{APP_URL}/onboarding?session_id={checkoutSessionId}`

### `invoice.paid` i `customer.subscription.deleted` — bez zmian

Operują na `stripeCustomerId` — niezależne od stanu onboardingu.

---

## 4. Nowy endpoint: `POST /api/onboarding`

**Plik:** `src/app/api/onboarding/route.ts`

**Wejście:** `{ sessionId: string, slug: string, password: string }`

**Logika:**

1. Pobierz Checkout Session ze Stripe (`stripe.checkout.sessions.retrieve(sessionId)`)
2. Sprawdź `session.payment_status === 'paid'` — jeśli nie: `400 Sesja nie jest opłacona`
3. Pobierz `stripeCustomerId` z sesji
4. Znajdź rekord w `clients` gdzie `stripeCustomerId = stripeCustomerId`
   - Brak rekordu → `400 Nie znaleziono sesji zakupu`
   - `onboardingCompletedAt` już ustawione → `409 { alreadyActivated: true }`
5. Walidacja sluga:
   - Tylko znaki `[a-z0-9-]`, długość 3–30
   - Sprawdź unikalność: `clients` where `slug = slug` nie może zwrócić żadnego rekordu
   - Zajęty → `409 { slugTaken: true }`
6. Walidacja hasła: minimum 8 znaków
7. Zahashuj hasło bcryptem (10 rund)
8. W transakcji:
   - `UPDATE clients SET slug = nowySlug, name = nowySlug, onboardingCompletedAt = now() WHERE stripeCustomerId = ...`
   - `INSERT INTO clientAuth (clientSlug, passwordHash)`
9. Wywołaj `vps.createClient(nowySlug, nowySlug)`
   - Jeśli błąd → rollback transakcji, zwróć `500 Błąd konfiguracji serwera`
10. `createSession(nowySlug)` — klient zalogowany od razu
11. Zwróć `{ ok: true }` → frontend przekierowuje na `/dashboard`

---

## 5. Nowa strona: `/onboarding`

**Plik:** `src/app/onboarding/page.tsx` (Server Component)
**Plik:** `src/app/onboarding/OnboardingForm.tsx` (Client Component)

### Server Component (`page.tsx`)

- Czyta `searchParams.session_id`
- Brak session_id → redirect `/login`
- Pobiera Checkout Session ze Stripe (server-side, bez ujawniania klucza klientowi)
- `payment_status !== 'paid'` → strona błędu "Nie znaleziono opłaconej sesji"
- Znajduje klienta po `stripeCustomerId`
- `onboardingCompletedAt` ustawione → strona "Konto już aktywowane" z linkiem do `/login`
- W przeciwnym razie → `<OnboardingForm sessionId={session_id} email={email} />`

### Client Component (`OnboardingForm.tsx`)

- Pola: slug (podpowiedź wygenerowana z emaila), hasło, powtórz hasło
- Walidacja po stronie klienta: regex slug, długość hasła, zgodność haseł
- Submit → `POST /api/onboarding`
- Obsługa odpowiedzi:
  - `409 alreadyActivated` → "Konto już zostało aktywowane, przejdź do logowania"
  - `409 slugTaken` → "Ta nazwa jest już zajęta, wybierz inną"
  - `500` → "Błąd serwera, spróbuj ponownie"
  - Sukces → `router.push('/dashboard')`

---

## 6. Nowy endpoint: `POST /api/auth/forgot-password`

**Plik:** `src/app/api/auth/forgot-password/route.ts`

**Wejście:** `{ email: string }`

**Logika:**

1. Znajdź klienta: `clients` where `email = email` AND `onboardingCompletedAt IS NOT NULL`
2. Zawsze zwróć `200 { ok: true }` (nie ujawniamy czy email istnieje w systemie)
3. Jeśli klient istnieje:
   - Wygeneruj token: `crypto.randomBytes(32).toString('hex')`
   - Wstaw do `passwordResetTokens`: `{ clientSlug, token, expiresAt: now + 1h }`
   - Wyślij email przez Resend z linkiem: `{APP_URL}/reset-password?token={token}`

---

## 7. Nowy endpoint: `POST /api/auth/reset-password`

**Plik:** `src/app/api/auth/reset-password/route.ts`

**Wejście:** `{ token: string, password: string }`

**Logika:**

1. Znajdź token: `passwordResetTokens` where `token = token`
2. Walidacje:
   - Brak tokenu → `400 Nieprawidłowy link`
   - `expiresAt < now` → `400 Link wygasł`
   - `usedAt IS NOT NULL` → `400 Link został już użyty`
3. Walidacja hasła: minimum 8 znaków
4. Zahashuj nowe hasło bcryptem (10 rund)
5. W transakcji:
   - `UPDATE clientAuth SET passwordHash = ... WHERE clientSlug = token.clientSlug`
   - `UPDATE passwordResetTokens SET usedAt = now() WHERE token = token`
6. Zwróć `{ ok: true }` → frontend przekierowuje na `/login`

---

## 8. Nowe strony: `/forgot-password` i `/reset-password`

### `/forgot-password`

**Plik:** `src/app/forgot-password/page.tsx`

- Formularz: pole email
- Submit → `POST /api/auth/forgot-password`
- Po odpowiedzi (zawsze 200) → komunikat "Jeśli ten email istnieje w systemie, wysłaliśmy link resetujący"

### `/reset-password`

**Plik:** `src/app/reset-password/page.tsx`

- Czyta `searchParams.token`, przekazuje do Client Component
- Formularz: nowe hasło + powtórz hasło
- Submit → `POST /api/auth/reset-password`
- `400` → wyświetl błąd z API
- Sukces → redirect `/login`

---

## 9. Aktualizacja strony logowania

**Plik:** `src/app/login/page.tsx`

Dodać link pod przyciskiem submit:
```tsx
<a href="/forgot-password" className="...">Zapomniałem hasła</a>
```

---

## Kolejność implementacji

1. `npm install resend`
2. Dodaj env vars: `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`
3. `src/db/schema.ts` → `slug` nullable, dodaj `onboardingCompletedAt`, dodaj tabelę `passwordResetTokens`
4. `npm run db:push`
5. Przebuduj `checkout.session.completed` w webhooku → pending rekord + email Resend
6. Stwórz `src/app/api/onboarding/route.ts`
7. Stwórz `src/app/onboarding/page.tsx` + `OnboardingForm.tsx`
8. Stwórz `src/app/api/auth/forgot-password/route.ts`
9. Stwórz `src/app/api/auth/reset-password/route.ts`
10. Stwórz `src/app/forgot-password/page.tsx`
11. Stwórz `src/app/reset-password/page.tsx`
12. Dodaj link "Zapomniałem hasła" do `src/app/login/page.tsx`

---

## Czego plan NIE obejmuje

- Google OAuth
- Stripe Customer Portal (zarządzanie subskrypcją przez klienta)
- Rate limiting na endpointach auth
- Wielokrotne aktywne tokeny reset hasła — stare nieużyte tokeny wygasają po 1h, nie są inwalidowane przy nowym requestcie
