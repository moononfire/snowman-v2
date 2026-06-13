# Plan scalenia: Snowman → Marketing-Runner

## Kontekst

Marketing-Runner to główna aplikacja: pozyskuje kontakty z Google Maps (przez VPS Worker), wysyła kampanie mailowe, zarządza klientami (multi-tenant). Snowman to osobna aplikacja z modułem kontaktów i dzwonienia (listy call, sesja call z kartami kontaktów). Celem jest wciągnięcie całego Snowmana do Marketing-Runnera, żeby jeden klient miał pełny flow:

```
Google Maps scrape → baza kontaktów → kampania mailowa → lista do dzwonienia → sesja call
```

---

## Różnice do pogodzenia

| Aspekt | Snowman | Marketing-Runner | Co robimy |
|---|---|---|---|
| ORM | Prisma | Drizzle | Przepisujemy wszystkie query Snowmana na Drizzle |
| Auth | NextAuth + JWT | jose JWT (custom) | Wyrzucamy NextAuth, używamy istniejącego `getSession()` |
| Multi-tenancy | brak (per-user `userId`) | slug-based (`clientId`) | Zamieniamy FK na `clientId` (UUID) — slug zostaje tylko do logowania i URL |
| Baza | Neon (osobny projekt) | Neon (`ep-damp-frost-as6eb29k`) | Wszystko idzie do bazy Marketing-Runnera |
| UI library | shadcn (@base-ui/react) | brak (plain Tailwind) | Kopiujemy komponenty shadcn ze Snowmana |
| Routing | `/`, `/lists`, `/contacts` | `/dashboard/*` | Snowman ląduje pod `/dashboard/contacts`, `/dashboard/lists` |

---

## Faza 1 — Refaktor tabeli `clients` + nowe tabele

**Plik:** `src/db/schema.ts`

### 1a. Zmiana w tabeli `clients`

Aktualna tabela `clients` używa `slug` jako PK i FK w każdym miejscu. To antywzorzec — slug może się zmienić, string jest wolniejszy niż UUID na indeksach, a slug pełni dwie role naraz.

Nowe podejście:
- `id` (UUID) — niezmienialny PK, używany jako FK we wszystkich tabelach
- `slug` — zostaje jako unikalny alias do logowania i URL, ale **nie jest FK**

```ts
export const clients = pgTable('clients', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),  // ← UUID, nie slug
  slug: text('slug').unique().notNull(),   // ← tylko do logowania/URL, nie FK
  name: text('name').notNull(),
  email: text('email'),
  status: text('status').default('active').notNull(),
  config: jsonb('config').default({}).notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const clientAuth = pgTable('client_auth', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text('client_id').notNull().references(() => clients.id),  // ← UUID zamiast slug
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

Analogicznie tabele `runs`, `campaigns`, `passwordResetTokens` — zmienić `clientId` → `clientId` (FK → `clients.id`).

### 1b. Zmiana w `src/lib/auth.ts`

Token JWT niesie `clientId` (UUID) zamiast `clientId`. Login flow:
1. Znajdź klienta po `slug` (wpisanym w formularzu)
2. Pobierz jego `id` (UUID)
3. Zapisz `clientId` w JWT

```ts
// session payload:
{ clientId: string }   // zamiast { clientId: string }
```

Wszystkie miejsca gdzie dotąd był `session.clientId` → `session.clientId`.

### 1c. Nowe tabele ze Snowmana

Klucz obcy to teraz `clientId` → `clients.id`, nie slug.

```ts
export const contacts = pgTable('contacts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text('client_id').notNull().references(() => clients.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  phone: text('phone').notNull(),
  company: text('company'),
  position: text('position'),
  email: text('email'),
  preCallNote: text('pre_call_note'),
  postCallNote: text('post_call_note'),
  tags: text('tags'),
  source: text('source').default('MANUAL').notNull(), // MANUAL | CSV_IMPORT | GOOGLE_SCRAPE
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const lists = pgTable('lists', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text('client_id').notNull().references(() => clients.id),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const listContacts = pgTable('list_contacts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  listId: text('list_id').notNull().references(() => lists.id, { onDelete: 'cascade' }),
  contactId: text('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  order: integer('order').default(0).notNull(),
  // NOT_CALLED | INTERESTED | NOT_INTERESTED | NO_ANSWER | CALLBACK | VOICEMAIL | WRONG_NUMBER
  status: text('status').default('NOT_CALLED').notNull(),
  notes: text('notes'),
  followUpAt: timestamp('follow_up_at', { withTimezone: true }),
  calledAt: timestamp('called_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('list_contacts_unique').on(t.listId, t.contactId),
  index('list_contacts_order_idx').on(t.listId, t.order),
])
```

> **Uwaga:** Baza jest świeża (brak danych produkcyjnych), więc zmiana PK w `clients` nie wymaga migracji danych — można zrobić `drizzle-kit push` bezpośrednio.

Po zmianach: `npx drizzle-kit generate` + `npx drizzle-kit migrate`.

---

## Faza 2 — Typy pomocnicze

**Nowy plik:** `src/lib/callTypes.ts`

Skopiować z `snowman/src/lib/types.ts` — enumy CallStatus i ContactSource z labelami i kolorami. Nie zmienia się nic, bo to czyste stałe TS.

```ts
// Skopiuj 1:1 z snowman/src/lib/types.ts
export type CallStatus = 'NOT_CALLED' | 'INTERESTED' | 'NOT_INTERESTED' | 'NO_ANSWER' | 'CALLBACK' | 'VOICEMAIL' | 'WRONG_NUMBER'
export type ContactSource = 'MANUAL' | 'CSV_IMPORT' | 'GOOGLE_SCRAPE'
export const CALL_STATUS_LABELS: Record<CallStatus, string> = { ... }
export const CALL_STATUS_COLORS: Record<CallStatus, string> = { ... }
// itd.
```

---

## Faza 3 — Komponenty UI

### 3a. shadcn base components

**Skopiować z `snowman/src/components/ui/` do `src/components/ui/`:**

- `button.tsx` — warianty CVA (@base-ui/react)
- `input.tsx`
- `label.tsx`
- `textarea.tsx`

Zainstalować brakujące dependency jeśli nie ma: `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`.

Dodać `src/lib/utils.ts` z funkcją `cn()` jeśli nie istnieje:
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

### 3b. Komponenty biznesowe

**Skopiować z `snowman/src/components/` do `src/components/`:**

| Plik | Co robi | Zmiany przy kopii |
|---|---|---|
| `contact-form.tsx` | Modal dodaj/edytuj kontakt | Zmienić fetch URL na `/api/contacts` (bez zmiany) |
| `contacts-browser.tsx` | Tabela kontaktów z filtrami, multi-select | Bez zmian logiki, sprawdzić import cn() |
| `import-modal.tsx` | Import CSV przez Papa Parse | Zainstalować `papaparse` + `@types/papaparse` |
| `add-contacts-modal.tsx` | Wyszukiwarka kontaktów do dodania do listy | Bez zmian |

**Sidebar** — nie kopiować wprost. Zamiast tego dodać pozycje "Kontakty" i "Listy" do istniejącego `src/app/dashboard/layout.tsx` (tam jest nawigacja dashboardu).

---

## Faza 4 — API Routes

Wszystkie nowe route'y idą pod `/src/app/api/`. Każdy route musi:
1. Wywołać `getSession()` z `src/lib/auth.ts`
2. Zwrócić 401 jeśli brak sesji
3. Filtrować wszystkie query przez `clientId` z sesji (izolacja tenantów)
4. Używać Drizzle zamiast Prisma

### 4a. Kontakty

**`src/app/api/contacts/route.ts`** — GET + POST

```
GET  /api/contacts
  - params: search, source, hasCompany, hasEmail, source
  - where: clientId = session.clientId
  - zwraca: Contact[]

POST /api/contacts
  - body: { firstName, lastName?, phone, company?, position?, email?, preCallNote?, postCallNote?, tags?, source? }
  - insert do contacts z clientId z sesji
```

**`src/app/api/contacts/[id]/route.ts`** — GET + PUT + DELETE

```
GET    /api/contacts/[id]  — sprawdź że contact.clientId === session.clientId
PUT    /api/contacts/[id]  — update pól kontaktu
DELETE /api/contacts/[id]  — usuń (cascade usuwa listContacts)
```

**`src/app/api/contacts/import/route.ts`** — POST

```
POST /api/contacts/import
  - body: { contacts: Array<raw CSV row> }
  - mapowanie kolumn (imie/firstName, telefon/phone, itd.) — skopiować logikę z snowman
  - bulk insert z clientId i source='CSV_IMPORT'
```

**`src/app/api/contacts/google-import/route.ts`** — POST

```
POST /api/contacts/google-import
  - body: { contacts: Contact[] } (już zmapowane przez VPS)
  - bulk insert z source='GOOGLE_SCRAPE'
  - To jest naturalny bridge: VPS Worker scrape → zapis kontaktów w tej samej bazie co kampanie
```

### 4b. Listy

**`src/app/api/lists/route.ts`** — GET + POST

```
GET  /api/lists
  - where: clientId = session.clientId
  - join listContacts żeby policzyć total, called, interested per lista
  - zwraca: List + { totalContacts, calledCount, interestedCount }[]

POST /api/lists
  - body: { name, description? }
  - insert z clientId z sesji
```

**`src/app/api/lists/[id]/route.ts`** — GET + PUT + DELETE

```
GET    — pełna lista z kontaktami (join contacts przez listContacts)
PUT    — update name/description
DELETE — usuń listę (cascade usuwa listContacts)
Walidacja: lists.clientId === session.clientId
```

**`src/app/api/lists/[id]/contacts/route.ts`** — POST

```
POST /api/lists/[id]/contacts
  - body: { contactIds: string[] }
  - sprawdź że lista należy do clientId
  - sprawdź że każdy kontakt należy do clientId
  - bulk insert do listContacts z order
```

**`src/app/api/lists/[id]/contacts/[contactId]/route.ts`** — PATCH + DELETE

```
PATCH — update: status, notes, followUpAt, calledAt
DELETE — usuń kontakt z listy (usuwa listContact, nie Contact)
```

---

## Faza 5 — Strony (Pages)

Wszystkie nowe strony idą pod `/src/app/dashboard/`. Korzystają z layoutu dashboardu (już ma auth check + sidebar).

### 5a. `/dashboard/contacts` — przeglądarka kontaktów

**Nowy plik:** `src/app/dashboard/contacts/page.tsx`

Skopiować logikę z `snowman/src/app/contacts/page.tsx`. Zamienić:
- `useSession()` z NextAuth → fetch danych po stronie serwera lub przez `getSession()` w Server Component
- Wszystkie fetch URL bez zmian (`/api/contacts`, `/api/contacts/import` itd.)
- Import komponentów: `ContactsBrowser`, `ContactForm`, `ImportModal`

Funkcje strony:
- Wyświetla tabelę wszystkich kontaktów (ContactsBrowser)
- Przycisk "Dodaj kontakt" → ContactForm modal
- Przycisk "Import CSV" → ImportModal
- Wybór kontaktów + "Utwórz listę z zaznaczonych"

### 5b. `/dashboard/lists` — lista list

**Nowy plik:** `src/app/dashboard/lists/page.tsx`

Skopiować z `snowman/src/app/lists/page.tsx`. Karty z:
- Nazwa listy
- Pasek postępu (wywołane/wszystkie)
- Statystyki (zainteresowani, oddzwonienie)
- Przyciski: Sesja call, Szczegóły, Usuń

### 5c. `/dashboard/lists/[id]` — szczegóły listy

**Nowy plik:** `src/app/dashboard/lists/[id]/page.tsx`

Skopiować z `snowman/src/app/lists/[id]/page.tsx`:
- Tabela kontaktów na liście ze statusami
- Przycisk "Dodaj kontakty" → AddContactsModal
- Przycisk "Rozpocznij sesję"
- Usuń kontakt z listy

### 5d. `/dashboard/lists/[id]/session` — sesja dzwonienia (najważniejsza)

**Nowy plik:** `src/app/dashboard/lists/[id]/session/page.tsx`

Skopiować 1:1 z `snowman/src/app/lists/[id]/session/page.tsx`. To jest kluczowy UI:
- Karta kontaktu: imię, firma, stanowisko, telefon (klikalny `tel:`), email
- Notatka przed rozmową (preCallNote)
- Selector statusu (7 opcji z kolorami)
- Pole notatki po rozmowie
- Datepicker "Oddzwoń" (przy statusie CALLBACK)
- Przyciski "Zapisz i następny" / "Zapisz"
- Pasek postępu (wywołane/wszystkie)
- Siatka kontaktów z kolorami statusów na dole

---

## Faza 6 — Nawigacja dashboard

**Plik do edycji:** `src/app/dashboard/layout.tsx`

Dodać do nawigacji dwie nowe pozycje:
- "Kontakty" → `/dashboard/contacts`
- "Listy call" → `/dashboard/lists`

Aktualne pozycje (Runs, Campaigns, Files, Settings) zostają bez zmian.

---

## Faza 7 — Podłączenie Google scrape do kontaktów

To jest naturalny zysk ze scalenia. Aktualnie VPS Worker robi scrape i wyniki trafiają jako outputFiles do `runs`. Po scaleniu:

**Edytować:** `src/app/api/webhooks/run-complete/route.ts`

Gdy run ma `script === 'google_scrape'` i status `done`, odczytać output files z VPS i automatycznie zaimportować kontakty do tabeli `contacts` z `source='GOOGLE_SCRAPE'`. Klient od razu widzi pozyskane kontakty w /dashboard/contacts.

---

## Faza 8 — Podłączenie kontaktów do kampanii (opcjonalnie)

Docelowo kampania mailowa powinna dostawać listę kontaktów zamiast ręcznych params.

**Edytować:** `src/app/api/campaigns/[id]/run/route.ts`

Dodać możliwość: kampania ma pole `listId`. Przy uruchomieniu run — pobierz kontakty z listy, przekaż jako params do VPS Worker.

Schema: dodać `listId text references lists.id` do tabeli `campaigns`.

To można zrobić w drugiej kolejności — nie blokuje faz 1-7.

---

## Zależności do zainstalowania

```bash
npm install papaparse @types/papaparse
```

Sprawdzić czy są (ze Snowmana, mogą brakować w marketing-runner):
```bash
npm install @base-ui/react class-variance-authority clsx tailwind-merge
```

---

## Kolejność realizacji

1. **Faza 1** — schema Drizzle + migracja (15 min, bez ryzyka — tylko nowe tabele)
2. **Faza 2** — `src/lib/callTypes.ts` (5 min, kopiowanie)
3. **Faza 3** — komponenty UI + install deps (30 min)
4. **Faza 4** — API routes (2-3h, przepisanie z Prisma na Drizzle)
5. **Faza 5** — strony dashboard (1-2h, kopiowanie + małe adaptacje)
6. **Faza 6** — nawigacja (15 min)
7. **Faza 7** — webhook google scrape → kontakty (30 min)
8. **Faza 8** — kampanie + listy (osobna iteracja)

---

---

## Jak traktujemy projekt Snowman

> **Snowman nie jest modyfikowany.** Otwieramy go wyłącznie do czytania — jest wzorcem/źródłem logiki. Wszystkie zmiany i nowy kod powstają tylko w Marketing-Runner.

Snowman można po zakończeniu scalania wyłączyć lub zostawić bez zmian — przestanie być potrzebny.

---

## Co czytamy ze Snowmana i jak przepisujemy do Marketing-Runner

### Pliki które ignorujemy (nie kopiujemy, nie czytamy)

```
src/auth.ts                              — NextAuth, zastąpiony przez istniejący auth MR
src/middleware.ts                        — NextAuth middleware, MR nie używa
src/types/next-auth.d.ts                — nie potrzebne
src/app/sign-in/, src/app/sign-up/      — MR ma własny /login + Stripe onboarding
src/app/api/auth/                        — NextAuth routes, nie przenosimy
src/lib/prisma.ts                        — używamy Drizzle
src/app/page.tsx                         — dashboard Snowmana, MR ma swój
src/app/layout.tsx                       — layout Snowmana z sidebarem, MR ma swój
src/components/sidebar.tsx               — MR ma własny layout dashboardu
src/components/theme-provider.tsx        — opcjonalne
src/components/theme-toggle.tsx          — opcjonalne
```

### Pliki które kopiujemy do MR bez zmian

Tworzone w Marketing-Runner pod identyczną ścieżką (podmienić prefix `snowman/src` → `marketing-runner/src`):

```
snowman/src/lib/types.ts              → src/lib/callTypes.ts  (tylko zmiana nazwy pliku)
snowman/src/lib/utils.ts              → src/lib/utils.ts  (jeśli nie istnieje)
snowman/src/components/ui/button.tsx  → src/components/ui/button.tsx
snowman/src/components/ui/input.tsx   → src/components/ui/input.tsx
snowman/src/components/ui/label.tsx   → src/components/ui/label.tsx
snowman/src/components/ui/textarea.tsx → src/components/ui/textarea.tsx
snowman/src/components/contact-form.tsx     → src/components/contact-form.tsx
snowman/src/components/contacts-browser.tsx → src/components/contacts-browser.tsx
snowman/src/components/import-modal.tsx     → src/components/import-modal.tsx
snowman/src/components/add-contacts-modal.tsx → src/components/add-contacts-modal.tsx
```

### Pliki które przepisujemy (logika ze Snowmana, ale nowy kod)

Czytamy plik ze Snowmana jako wzorzec, tworzymy nowy plik w Marketing-Runner z przepisaną logiką. Dwie zmiany obowiązują wszędzie:

1. **Auth:** `getServerSession(authOptions)` → `getSession()` z `src/lib/auth.ts`; `session.user.id` → `session.clientId`
2. **Query:** Prisma → Drizzle (patrz wzorzec poniżej)

| Czytamy ze Snowmana | Tworzymy w Marketing-Runner |
|---|---|
| `src/app/contacts/page.tsx` | `src/app/dashboard/contacts/page.tsx` |
| `src/app/lists/page.tsx` | `src/app/dashboard/lists/page.tsx` |
| `src/app/lists/[id]/page.tsx` | `src/app/dashboard/lists/[id]/page.tsx` |
| `src/app/lists/[id]/session/page.tsx` | `src/app/dashboard/lists/[id]/session/page.tsx` |
| `src/app/lists/[id]/add-contacts/page.tsx` | `src/app/dashboard/lists/[id]/add-contacts/page.tsx` |
| `src/app/api/contacts/route.ts` | `src/app/api/contacts/route.ts` |
| `src/app/api/contacts/[id]/route.ts` | `src/app/api/contacts/[id]/route.ts` |
| `src/app/api/contacts/import/route.ts` | `src/app/api/contacts/import/route.ts` |
| `src/app/api/contacts/google-import/route.ts` | `src/app/api/contacts/google-import/route.ts` |
| `src/app/api/lists/route.ts` | `src/app/api/lists/route.ts` |
| `src/app/api/lists/[id]/route.ts` | `src/app/api/lists/[id]/route.ts` |
| `src/app/api/lists/[id]/contacts/route.ts` | `src/app/api/lists/[id]/contacts/route.ts` |
| `src/app/api/lists/[id]/contacts/[contactId]/route.ts` | `src/app/api/lists/[id]/contacts/[contactId]/route.ts` |

### Wzorzec przepisania query (Prisma → Drizzle)

```ts
// WZORZEC ZE SNOWMANA (nie kopiować)
import { prisma } from '@/lib/prisma'
const session = await getServerSession(authOptions)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const result = await prisma.contact.findMany({
  where: { userId: session.user.id }
})

// NOWY KOD W MARKETING-RUNNER
import { db } from '@/db'
import { contacts } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq } from 'drizzle-orm'
const session = await getSession()
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const result = await db.select().from(contacts).where(eq(contacts.clientId, session.clientId))
```

### Nowe zależności do zainstalowania w Marketing-Runner

```bash
npm install papaparse @types/papaparse date-fns
# Jeśli brakuje (Snowman ma, MR może nie mieć):
npm install @base-ui/react class-variance-authority clsx tailwind-merge
```

---

## Czego NIE przenosimy ze Snowmana

- `src/auth.ts` (NextAuth config) — używamy istniejącego auth z marketing-runner
- `src/app/sign-in/`, `src/app/sign-up/` — marketing-runner ma własny login + onboarding Stripe
- `src/app/api/auth/` (NextAuth routes) — j.w.
- `middleware.ts` (NextAuth middleware) — marketing-runner nie używa NextAuth
- `src/lib/prisma.ts` — używamy Drizzle
- `src/types/next-auth.d.ts` — nie potrzeba
- `snowman/src/app/page.tsx` (dashboard Snowmana) — marketing-runner ma swój dashboard

---

## Wynik końcowy

Po scaleniu marketing-runner ma pełen flow w jednym miejscu, pod jednym loginem Stripe:

```
/dashboard            — overview runs + kampanie (obecny)
/dashboard/contacts   — baza kontaktów (z Google Maps scrape, CSV, ręcznie)
/dashboard/lists      — listy do dzwonienia
/dashboard/lists/[id]/session — sesja call
/dashboard/campaigns  — kampanie mailowe
/dashboard/runs       — historia uruchomień VPS
/dashboard/files      — pliki output
/dashboard/settings   — ustawienia konta
```
