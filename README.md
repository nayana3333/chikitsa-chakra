# Chikitsa Chakra

**Panchakarma patient management and therapy scheduling for Ayurvedic clinics.**

Smart India Hackathon 2025 · Problem Statement **SIH25023** · Team Chikitsa Chakra (Team ID 22)

Most clinic software treats Ayurveda as generic appointment booking with different words on the buttons. This models the thing itself: constitution assessment, the three-phase structure of a Panchakarma course, mandated rest days, contraindications, and the medicated materials each procedure consumes.

---

## Quick start

```bash
npm install
```

```bash
npm run db:start
```

Copy `.env.example` to `.env`, then paste in the **TCP** connection URL that `npx prisma dev ls` prints (Prisma 7's driver adapter talks to Postgres through the `pg` driver, so it needs a standard `postgres://` string, not the `prisma+postgres://` proxy URL). Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then set up the schema and seed a full clinic:

```bash
npm run db:migrate && npm run db:seed
```

```bash
npm run dev
```

Open <http://localhost:3000>.

### Demo accounts

All four use the password `Chikitsa@2026`:

| Role | Email |
|---|---|
| Patient | `patient@chikitsa.dev` |
| Doctor | `doctor@chikitsa.dev` |
| Therapist | `therapist@chikitsa.dev` |
| Admin | `admin@chikitsa.dev` |

The seed is deterministic — 24 patients, 24 therapy plans, 159 scheduled sessions, 103 progress entries, inventory with batches that are about to expire, and unpaid invoices. Every dashboard has real data on first run.

---

## What it does

**Four roles, one record.** A doctor prescribes a protocol, the scheduling engine lays it across the calendar, therapists execute and log each session, and the patient watches their own progress.

| Role | Sees |
|---|---|
| **Patient** | Today's instructions, upcoming sessions, dosha profile vs. baseline, progress charts, diet plan, AI assistant |
| **Doctor** | Patient queue, therapy plans, dominant imbalance per patient, who is responding best to treatment |
| **Therapist** | Daily roster as a timeline, per-session vitals, certified procedures, week ahead |
| **Admin** | Session volume, collection rate, outstanding invoices, stock and expiry alerts, audit log |

### The two engines

The clinical logic lives in pure, dependency-free TypeScript modules with no database or React imports, so it can be reasoned about and tested directly.

**1. Dosha scoring** — [`src/lib/ayurveda/dosha.ts`](src/lib/ayurveda/dosha.ts)

A 16-question weighted questionnaire scores Vata, Pitta and Kapha. Questions carry different weights because classical assessment does not treat all traits equally: stable physical traits (frame, skin, hair) are strong evidence of innate constitution, while mood and appetite fluctuate daily.

It produces two separate readings, and the difference between them is the point:

- **Prakriti** — the constitution you were born with. Fixed for life.
- **Vikriti** — where you are now. Shifts with season, diet, stress and illness.

`compareToBaseline()` measures drift rather than absolute values, because a Pitta-dominant person at 55% Pitta is balanced while a Kapha-dominant person at 55% Pitta is significantly aggravated. That distinction is what the doctor treats, and it drives the patient's comparison chart.

Percentages are computed with the largest-remainder method so they always total exactly 100 — rounding each share independently gives 99% or 101% next to a chart.

**2. Therapy scheduling** — [`src/lib/scheduling/engine.ts`](src/lib/scheduling/engine.ts)

Takes a protocol template and produces a dated, resource-allocated plan. It understands that Panchakarma runs **Purvakarma → Pradhanakarma → Paschatkarma** and sorts by phase within a day, honours prescribed rest days (which consume no room or therapist), matches each therapy to the room type it actually needs (Basti needs a Basti suite; Swedana needs a steam chamber), and never double-books a therapist or a room — including against other sessions in the same plan.

Placement is earliest-fit rather than an optimiser, deliberately: clinics genuinely prefer morning slots because most procedures are done on an empty stomach, and a greedy pass produces a result a receptionist can predict and override.

When a session can't be placed it returns a typed reason (`NO_THERAPIST_WITH_EXPERTISE`, `NO_ROOM_AVAILABLE`, `CLINIC_CLOSED`, …) rather than leaving a silent gap in the calendar.

`checkContraindications()` flags classical contraindications — Vamana in cardiac disease, purgation in pregnancy, Swedana burn risk in diabetes — for the prescribing doctor to acknowledge. **It never blocks a prescription.** Clinical judgement belongs to the clinician; the software's job is to make sure nothing was overlooked silently, and to record that the check happened.

The seed script runs this engine to place all 159 sessions, so it's exercised end to end rather than only in tests.

### AI assistant

A streaming patient assistant built on the Anthropic API (`claude-opus-5`, adaptive thinking, cached system prompt).

The scope boundary matters more than the capability. The system prompt allows explaining doshas, procedures and preparation, and forbids diagnosing, or recommending or changing any therapy, medicine or dose. Those rules live in the prompt, because the model is what has to honour them — not in UI copy.

**It degrades gracefully.** Without `ANTHROPIC_API_KEY` the feature runs in demo mode with scripted answers streamed through the identical code path, and the UI badge says "Demo mode" rather than pretending. A demo that dies because an env var is missing is worse than one that degrades honestly.

---

## Security model

The original reference implementation this project replaces stored `localStorage.setItem('authToken', 'dummy-auth')` and decided access from a `userType` string in the same store. That is not a security model. This is:

- **Sessions are signed JWTs in an httpOnly cookie** (`jose`, HS256, `sameSite: lax`). Unreachable from `document.cookie`, so XSS cannot lift a session.
- **The token carries an id and a role and nothing else.** Everything richer is read from the database, so a stolen cookie leaks no patient data and a deactivated account loses access immediately rather than at token expiry.
- **Authorization lives in a Data Access Layer** ([`src/lib/auth/dal.ts`](src/lib/auth/dal.ts)), next to the data — not in layouts. Next.js layouts don't re-render when navigating between sibling routes, so a check there goes stale. Each function is wrapped in React's `cache`, so ten components calling `getCurrentUser()` produce one query.
- **`proxy.ts`** (Next 16's renamed middleware) does *optimistic* checks only — it reads the signed cookie, never the database, because it runs on every request including prefetches.
- **Passwords are bcrypt at cost 12.** Login compares against a dummy hash when no user matches, so response timing doesn't reveal which emails are registered, and every failure mode returns one identical message.
- **Server Actions and Route Handlers re-verify.** They are public HTTP endpoints; hiding a button is not access control.
- **Public registration creates patients only.** Staff accounts are created by an administrator — letting anyone claim a clinical role from a public form would undo the whole model in one input field.
- **Append-only audit log** over logins, registrations, assessments and clinical record changes.

Verified by the smoke test, which asserts that a patient's cookie can't reach `/admin`, that anonymous requests are redirected, and that a forged cookie is rejected.

---

## Tests

```bash
npm test
```

38 unit tests over the two engines — dosha scoring (weighting, rounding to exactly 100, dual-dosha and tridoshic classification, baseline drift) and scheduling (overlap detection, phase ordering, rest days, room-type matching, therapist availability and time off, double-booking prevention, turnaround buffers, load spreading, contraindications).

One of them caught a real bug during development: with zero answers submitted, every dosha tied at 0, which fell through the "two doshas are close" branch and confidently reported a **Vata-Pitta** constitution derived from no evidence at all. It now returns `"Not assessed"`.

```bash
npm run dev          # in one terminal
node scripts/smoke.mjs   # in another
```

The smoke test mints session cookies the same way the app does, then asserts every dashboard and sub-page renders with real data, that the streaming assistant returns tokens, and that all three access-control paths hold.

```bash
npm run typecheck && npm run build
```

---

## Stack

| | | |
|---|---|---|
| **Next.js 16.3** | App Router, Server Components, Server Actions | Rendering + routing |
| **TypeScript 5.9** | `strict` | Type safety end to end |
| **Prisma 7.9** | `prisma-client` generator + `@prisma/adapter-pg` | Typed data access |
| **PostgreSQL** | Prisma's bundled dev server locally | Enums, JSON, decimals |
| **Tailwind CSS v4** | CSS-first `@theme` tokens, oklch palette | Styling |
| **Radix UI + CVA** | Hand-rolled primitives | Accessible components |
| **jose + bcryptjs** | — | Sessions and password hashing |
| **Zod 4** | — | Validation at every boundary |
| **Recharts** | — | Progress and analytics charts |
| **Vitest** | — | Unit tests |
| **Anthropic SDK** | `claude-opus-5` | AI assistant |

### Notes on the versions

Next.js 16 and Prisma 7 are both recent majors with breaking changes, and this project uses the current conventions rather than the older ones:

- Middleware is **`proxy.ts`**, exporting `proxy()`. The `edge` runtime is not supported there.
- `cookies()`, `headers()`, `params` and `searchParams` are **async** — the synchronous compatibility shim is gone.
- Route types come from `next typegen` (`PageProps<'/route'>`, `LayoutProps<'/route'>`). A layout inside a route group has no URL segment, so it takes plain props instead.
- `forbidden()` requires `experimental.authInterrupts`, enabled in `next.config.ts` so an authenticated-but-unauthorised user gets a real 403 page instead of being bounced to login as if signed out.
- Prisma 7 **requires a driver adapter** for SQL providers, generates the client into `src/generated/prisma` (so imports are `@/generated/prisma/client`, not `@prisma/client`), and moves the datasource URL into `prisma.config.ts`.
- The connection pool is capped below the server's own limit. Dashboards fan several queries out with `Promise.all`; an uncapped pool opens one connection per query and overshoots, which surfaces as an opaque `P1017` partway through a page render.

---

## Project structure

```
prisma/
  schema.prisma          25 models — the domain
  seed.ts                deterministic clinic generator
src/
  app/
    (auth)/              login, register
    patient/ doctor/ therapist/ admin/
    notifications/       shared across roles
    api/assistant/       streaming AI endpoint
    actions/             Server Actions (auth, assessment, notifications)
  components/
    ui/                  Button, Card, Input, Badge, Dialog, Table…
    shell/               role-aware sidebar + topbar
    charts.tsx           the only client-side chart code
  lib/
    ayurveda/            dosha scoring engine + questionnaire  ← tested
    scheduling/          therapy scheduling engine             ← tested
    auth/                session, Data Access Layer
    ai/                  Anthropic client + demo fallback
  proxy.ts               optimistic route protection
scripts/smoke.mjs        end-to-end auth + render checks
```

---

## Deploying

The app is a standard Next.js deployment. Point `DATABASE_URL` at any managed Postgres (Neon, Supabase, RDS) — the same variable works unchanged, since local development already speaks plain Postgres over TCP. Set a fresh `SESSION_SECRET` per environment, run `npx prisma migrate deploy`, and optionally set `ANTHROPIC_API_KEY` to move the assistant from demo mode to live.

---

## Engineering decisions worth discussing

Short version of the reasoning, for anyone reading the code:

1. **Clinical logic is pure functions.** No Prisma or React import in either engine. That's what makes 38 tests possible without a database, and what let a subtle scoring bug surface in a unit test rather than in front of a judge.
2. **Authorization sits next to the data, not in the UI.** Layouts don't re-render across sibling routes; the DAL does, on every call.
3. **Failed scheduling returns reasons, not gaps.** `UnscheduledSession` carries a typed reason and a human-readable detail, so a receptionist can act on it.
4. **Contraindications advise, they don't block.** Encoding "the software decides" into a clinical system is the wrong default; encoding "the software makes sure you saw it, and records that you did" is the right one.
5. **The AI degrades instead of failing.** Same code path, scripted content, honest badge.
6. **The seed uses the real engine.** If the scheduler breaks, the seed breaks — the demo data can't drift away from the production code path.
