# Milestone 1: Onboarding, ETA/Licence Requests & Portal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A tourist can sign up in the mobile app, see their ETA and driving assessment, request help with either, and follow progress, while staff work those requests in a web portal.

**Architecture:** pnpm monorepo. `packages/core` holds pure, unit-tested rules and types shared by both apps. Supabase provides Postgres (with row-level security), Auth, Storage and an Edge Function for push. `apps/mobile` (Expo Router) and `apps/portal` (Next.js App Router) talk to Supabase directly with `@supabase/supabase-js`; status changes go only through the `change_request_status` SQL function.

**Tech Stack:** TypeScript (strict), pnpm workspaces, Vitest, Expo (latest stable SDK) + Expo Router + jest-expo + @testing-library/react-native, Next.js (latest stable) + Playwright, Supabase CLI (local stack in Docker), pgTAP, Expo Push API.

**Spec:** `docs/superpowers/specs/2026-11-05-sri-lanka-tourist-app-design.md`

## Global Constraints

- Node ≥ 20, pnpm ≥ 9, TypeScript `strict: true` in every package.
- Country codes are ISO 3166-1 alpha-2, uppercase (`"IN"`, `"GB"`).
- Dates are ISO `YYYY-MM-DD` strings in Sri Lanka time (`Asia/Colombo`); no `Date` objects cross package boundaries.
- Stay length = calendar days from arrival to departure **inclusive** (1 Jan → 30 Jan = 30).
- Request types: `eta_application`, `driving_permit`. Statuses: `submitted`, `in_review`, `needs_info`, `completed`, `rejected`, `cancelled`.
- Never show "no visa needed". Unknown country → "Our team will check your visa requirements."
- Tuk-tuk note shown on every driving result: "Three-wheelers (tuk-tuks) need a separate permit — ask us."
- Storage bucket `documents` is private; paths `<profile_id>/<request_id>/<kind>-<uuid>.<ext>`.
- User-facing strings live in `apps/mobile/src/strings.ts` and `apps/portal/src/strings.ts`.
- No payments in M1.

## Review Focus

1. **Trip longer than the ETA allows** (e.g. 45-day stay on a 30-day free ETA) → `stay_exceeds_eta`, not `eta_free`. Test in Task 1.
2. **Nationality missing from the rules table** → `unknown_country`, never treated as free. Test in Task 1.
3. **Bad trip dates**: departure before arrival, arrival in the past → wizard blocks with a message. Tests in Task 2 and Task 6.
4. **Licence expiring before departure** → `licence_expires_during_trip`. Test in Task 2.
5. **Double-tap / retry submits twice** → second open request of the same type for the same trip is refused by a unique index. Test in Task 3.

---

### Task 1: Monorepo + visa assessment in `packages/core`

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.nvmrc` (`20`)
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/vitest.config.ts`
- Create: `packages/core/src/types.ts`, `packages/core/src/dates.ts`, `packages/core/src/visa.ts`, `packages/core/src/index.ts`
- Test: `packages/core/src/visa.test.ts`, `packages/core/src/dates.test.ts`

**Interfaces:**
- Produces:
  - `type IsoDate = string`, `type CountryCode = string`
  - `interface VisaRule { countryIso2: CountryCode; feeUsd: number; maxStayDays: number }`
  - `type VisaAssessment = { kind: 'eta_free'; stayDays: number; maxStayDays: number } | { kind: 'eta_paid'; feeUsd: number; stayDays: number; maxStayDays: number } | { kind: 'stay_exceeds_eta'; feeUsd: number; stayDays: number; maxStayDays: number } | { kind: 'unknown_country' }`
  - `stayDays(arrival: IsoDate, departure: IsoDate): number`
  - `assessVisa(input: { nationalityIso2: CountryCode; arrival: IsoDate; departure: IsoDate }, rules: VisaRule[]): VisaAssessment`

- [ ] **Step 1: Scaffold workspace.** Root `package.json` scripts: `"test": "pnpm -r test"`, `"typecheck": "pnpm -r typecheck"`. `pnpm-workspace.yaml` includes `apps/*`, `packages/*`. Core package name `@tourist/core`, scripts `test: vitest run`, `typecheck: tsc --noEmit`.
- [ ] **Step 2: Write failing tests**

```ts
// dates.test.ts
expect(stayDays('2027-01-01', '2027-01-30')).toBe(30);
expect(stayDays('2027-01-01', '2027-01-01')).toBe(1);
expect(stayDays('2027-02-27', '2027-03-01')).toBe(3); // crosses month end

// visa.test.ts — fixture rules, not real data
const rules = [
  { countryIso2: 'IN', feeUsd: 0, maxStayDays: 30 },
  { countryIso2: 'DE', feeUsd: 50, maxStayDays: 30 },
];
test('free ETA within 30 days', () =>
  expect(assessVisa({ nationalityIso2: 'IN', arrival: '2027-01-01', departure: '2027-01-30' }, rules))
    .toEqual({ kind: 'eta_free', stayDays: 30, maxStayDays: 30 }));
test('paid ETA', () =>
  expect(assessVisa({ nationalityIso2: 'DE', arrival: '2027-01-01', departure: '2027-01-10' }, rules))
    .toEqual({ kind: 'eta_paid', feeUsd: 50, stayDays: 10, maxStayDays: 30 }));
test('stay over limit', () =>
  expect(assessVisa({ nationalityIso2: 'IN', arrival: '2027-01-01', departure: '2027-01-31' }, rules).kind)
    .toBe('stay_exceeds_eta'));
test('unknown country is never free', () =>
  expect(assessVisa({ nationalityIso2: 'ZZ', arrival: '2027-01-01', departure: '2027-01-05' }, rules))
    .toEqual({ kind: 'unknown_country' }));
test('lowercase nationality is normalised', () =>
  expect(assessVisa({ nationalityIso2: 'in', arrival: '2027-01-01', departure: '2027-01-05' }, rules).kind)
    .toBe('eta_free'));
```

- [ ] **Step 3: Run** `pnpm --filter @tourist/core test` → FAIL (`assessVisa` not defined).
- [ ] **Step 4: Implement** `stayDays` (parse as UTC midnight, diff days + 1) and `assessVisa` (find rule by uppercased code; `stay_exceeds_eta` takes precedence over free/paid).
- [ ] **Step 5: Run** tests → PASS; `pnpm typecheck` → no errors.
- [ ] **Step 6: Commit** `feat(core): monorepo scaffold and visa assessment`

---

### Task 2: Licence assessment, trip validation, request status machine

**Files:**
- Create: `packages/core/src/licence.ts`, `packages/core/src/trip.ts`, `packages/core/src/requests.ts`
- Modify: `packages/core/src/index.ts` (re-export)
- Test: `packages/core/src/licence.test.ts`, `packages/core/src/trip.test.ts`, `packages/core/src/requests.test.ts`

**Interfaces:**
- Consumes: `IsoDate`, `CountryCode` (Task 1)
- Produces:
  - `type LicenceAssessment = { kind: 'no_licence' } | { kind: 'licence_expires_during_trip'; expiryDate: IsoDate } | { kind: 'eligible_for_permit'; route: 'aa_ceylon_recognition' | 'dmt_temporary_permit' }`
  - `assessLicence(input: { hasLicence: boolean; expiryDate?: IsoDate; hasIdp: boolean; departure: IsoDate }): LicenceAssessment`
  - `type TripError = 'departure_before_arrival' | 'arrival_in_past'`
  - `validateTrip(arrival: IsoDate, departure: IsoDate, today: IsoDate): { ok: true } | { ok: false; error: TripError }`
  - `const REQUEST_TYPES = ['eta_application', 'driving_permit'] as const; type RequestType`
  - `const REQUEST_STATUSES = ['submitted','in_review','needs_info','completed','rejected','cancelled'] as const; type RequestStatus`
  - `type ActorRole = 'tourist' | 'staff'`
  - `nextStatuses(from: RequestStatus, role: ActorRole): RequestStatus[]`
  - `isTerminal(status: RequestStatus): boolean`

- [ ] **Step 1: Write failing tests**

```ts
// licence.test.ts
expect(assessLicence({ hasLicence: false, hasIdp: false, departure: '2027-01-10' })).toEqual({ kind: 'no_licence' });
expect(assessLicence({ hasLicence: true, expiryDate: '2027-01-05', hasIdp: true, departure: '2027-01-10' }))
  .toEqual({ kind: 'licence_expires_during_trip', expiryDate: '2027-01-05' });
expect(assessLicence({ hasLicence: true, expiryDate: '2030-01-01', hasIdp: true, departure: '2027-01-10' }))
  .toEqual({ kind: 'eligible_for_permit', route: 'aa_ceylon_recognition' });
expect(assessLicence({ hasLicence: true, expiryDate: '2030-01-01', hasIdp: false, departure: '2027-01-10' }))
  .toEqual({ kind: 'eligible_for_permit', route: 'dmt_temporary_permit' });
expect(assessLicence({ hasLicence: true, expiryDate: '2027-01-10', hasIdp: false, departure: '2027-01-10' }).kind)
  .toBe('eligible_for_permit'); // valid through departure day

// trip.test.ts
expect(validateTrip('2027-01-10', '2027-01-05', '2026-12-01')).toEqual({ ok: false, error: 'departure_before_arrival' });
expect(validateTrip('2026-11-01', '2026-11-10', '2026-11-05')).toEqual({ ok: false, error: 'arrival_in_past' });
expect(validateTrip('2026-11-05', '2026-11-05', '2026-11-05')).toEqual({ ok: true });

// requests.test.ts — the matrix the SQL function must mirror (Task 4)
expect(nextStatuses('submitted', 'staff')).toEqual(['in_review']);
expect(nextStatuses('submitted', 'tourist')).toEqual(['cancelled']);
expect(nextStatuses('in_review', 'staff')).toEqual(['needs_info', 'completed', 'rejected']);
expect(nextStatuses('in_review', 'tourist')).toEqual([]);
expect(nextStatuses('needs_info', 'tourist')).toEqual(['in_review', 'cancelled']);
expect(nextStatuses('needs_info', 'staff')).toEqual(['in_review']);
for (const s of ['completed', 'rejected', 'cancelled'] as const) {
  expect(isTerminal(s)).toBe(true);
  expect(nextStatuses(s, 'staff')).toEqual([]);
}
```

- [ ] **Step 2: Run** `pnpm --filter @tourist/core test` → FAIL.
- [ ] **Step 3: Implement** the three modules; the transition matrix is a `Record<RequestStatus, Record<ActorRole, RequestStatus[]>>` constant exported as `TRANSITIONS`.
- [ ] **Step 4: Run** tests → PASS.
- [ ] **Step 5: Commit** `feat(core): licence assessment, trip validation, request status machine`

---

### Task 3: Supabase schema, row-level security, seed

**Files:**
- Create: `supabase/config.toml` (via `supabase init`)
- Create: `supabase/migrations/20261105000001_schema.sql`, `supabase/migrations/20261105000002_rls.sql`, `supabase/migrations/20261105000003_storage.sql`
- Create: `supabase/seed.sql`
- Test: `supabase/tests/rls_test.sql`, `supabase/tests/schema_test.sql`

**Interfaces:**
- Produces tables (all `id uuid default gen_random_uuid()` unless noted, `created_at timestamptz default now()`):
  - `profiles(id uuid pk references auth.users, full_name text not null, phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'), nationality_iso2 char(2) not null)`
  - `trips(id, profile_id → profiles, arrival_date date not null, departure_date date not null, check (departure_date >= arrival_date))`
  - `licences(profile_id pk → profiles, has_licence bool not null, issuing_country_iso2 char(2), licence_number text, expiry_date date, has_idp bool not null default false)`
  - `country_visa_rules(country_iso2 char(2) pk, fee_usd numeric(6,2) not null, max_stay_days int not null default 30, source_url text not null, verified_on date not null)`
  - `staff(user_id uuid pk references auth.users, role text not null check (role in ('agent','admin')))`
  - `service_requests(id, profile_id → profiles, trip_id → trips, type text check in REQUEST_TYPES, status text not null default 'submitted' check in REQUEST_STATUSES, details jsonb not null default '{}', assigned_to uuid references staff, updated_at timestamptz)`
  - unique partial index `one_open_request_per_type` on `service_requests(trip_id, type) where status not in ('completed','rejected','cancelled')`
  - `request_events(id, request_id → service_requests, actor_id uuid not null, from_status text, to_status text not null, note text)`
  - `request_documents(id, request_id → service_requests, kind text not null check (kind in ('passport','licence_front','licence_back','idp','photo','eta_approval','permit')), storage_path text not null, uploaded_by uuid not null)`
  - `push_tokens(profile_id → profiles, expo_token text, primary key (profile_id, expo_token))`
  - SQL helper `is_staff() returns bool`, `is_admin() returns bool` (security definer, `auth.uid()` lookup)
- Seed: `country_visa_rules` rows copied from the official list on eta.gov.lk on the day of implementation, with `source_url` and `verified_on`; one admin staff user `admin@example.test`; one demo tourist with a trip.

- [ ] **Step 1: Write failing pgTAP tests** (`supabase/tests/*.sql`):
  - `schema_test.sql`: `has_table` for every table above; inserting a trip with departure before arrival raises `23514`; inserting a second `submitted` `eta_application` for the same trip raises `23505`; inserting a second one after the first is `cancelled` succeeds.
  - `rls_test.sql`: as tourist A, `select count(*) from service_requests` returns only A's rows (0 of B's); A cannot `select` B's `profiles` row; A cannot `insert` into `country_visa_rules`; as an `agent`, sees both A's and B's requests; agent cannot update `country_visa_rules`; admin can. Tourist A cannot `update service_requests set status=...` directly (0 rows affected).
  - Storage: tourist A can read objects under `A/…` and not under `B/…`; staff can read both.
- [ ] **Step 2: Run** `supabase start && supabase test db` → FAIL (tables missing).
- [ ] **Step 3: Write migrations.** RLS: tourists `select/insert/update` their own `profiles`, `trips`, `licences`, `push_tokens`; `select/insert` own `service_requests` (no `update` — status goes through Task 4's function); `select` own `request_events`; `select/insert` own `request_documents`. Staff `select` all of the above. `country_visa_rules`: `select` for any authenticated user, write for `is_admin()`. Storage policies on bucket `documents` keyed on `(storage.foldername(name))[1] = auth.uid()::text` or `is_staff()`.
- [ ] **Step 4: Run** `supabase db reset && supabase test db` → PASS.
- [ ] **Step 5: Generate types** `supabase gen types typescript --local > packages/core/src/database.types.ts`; re-export from `index.ts`.
- [ ] **Step 6: Commit** `feat(db): schema, RLS, storage policies, seed`

---

### Task 4: `change_request_status` function

**Files:**
- Create: `supabase/migrations/20261105000004_change_status.sql`
- Test: `supabase/tests/change_status_test.sql`

**Interfaces:**
- Consumes: tables from Task 3; transition matrix from Task 2 (`TRANSITIONS`)
- Produces: `change_request_status(p_request_id uuid, p_to_status text, p_note text default null) returns service_requests` — security definer; determines role (`staff` if `is_staff()`, `tourist` if owner, else raise `42501`); raises `P0001 'illegal_transition'` if `p_to_status` is not in the matrix for (current status, role); updates `status`, `updated_at`; inserts `request_events`.

- [ ] **Step 1: Write failing pgTAP tests** — one per matrix cell from Task 2 Step 1 (allowed cells succeed and write exactly one event with correct `from_status`/`to_status`/`note`; a sample of disallowed cells raise `illegal_transition`: tourist `submitted→completed`, staff `completed→in_review`, staff `submitted→completed`); tourist B changing tourist A's request raises `42501`.
- [ ] **Step 2: Run** `supabase test db` → FAIL.
- [ ] **Step 3: Implement** the function with the matrix as a `values` list; also insert the initial `request_events` row (`from_status null → submitted`) via an `after insert` trigger on `service_requests`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(db): validated request status changes with audit events`

---

### Task 5: Mobile app scaffold + email code sign-in

**Files:**
- Create: `apps/mobile/` via `npx create-expo-app@latest apps/mobile --template tabs`, then trim
- Create: `apps/mobile/src/lib/supabase.ts`, `apps/mobile/src/lib/session.tsx`, `apps/mobile/src/strings.ts`
- Create: `apps/mobile/app/_layout.tsx`, `apps/mobile/app/(auth)/sign-in.tsx`, `apps/mobile/app/(auth)/verify.tsx`
- Create: `apps/mobile/.env.example` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- Test: `apps/mobile/src/lib/session.test.tsx`, `apps/mobile/app/(auth)/sign-in.test.tsx`

**Interfaces:**
- Consumes: `@tourist/core` (workspace dependency)
- Produces:
  - `supabase` client (AsyncStorage session persistence)
  - `<SessionProvider>`, `useSession(): { session: Session | null; profile: ProfileRow | null; loading: boolean; refreshProfile(): Promise<void> }`
  - Routing rule in `_layout.tsx`: no session → `(auth)`; session but no profile → `/onboarding`; else `(tabs)`

- [ ] **Step 1: Write failing tests** (jest-expo + RNTL, Supabase client mocked): sign-in screen disables "Send code" until the email is valid; pressing it calls `supabase.auth.signInWithOtp({ email })` and navigates to `verify`; verify screen calls `verifyOtp({ email, token, type: 'email' })` with the 6-digit code; `useSession` returns `profile: null` when the `profiles` query returns no row.
- [ ] **Step 2: Run** `pnpm --filter mobile test` → FAIL.
- [ ] **Step 3: Implement** screens, provider and the routing rule.
- [ ] **Step 4: Run** → PASS. Manual: `pnpm --filter mobile start`, sign in against local Supabase (codes visible in Inbucket at `localhost:54324`).
- [ ] **Step 5: Commit** `feat(mobile): scaffold and email code sign-in`

---

### Task 6: Onboarding wizard

**Files:**
- Create: `apps/mobile/app/onboarding/_layout.tsx`, `apps/mobile/app/onboarding/about-you.tsx`, `apps/mobile/app/onboarding/trip.tsx`, `apps/mobile/app/onboarding/licence.tsx`
- Create: `apps/mobile/src/onboarding/useOnboardingDraft.ts`, `apps/mobile/src/onboarding/saveOnboarding.ts`, `apps/mobile/src/components/CountryPicker.tsx`
- Test: `apps/mobile/src/onboarding/saveOnboarding.test.ts`, `apps/mobile/app/onboarding/trip.test.tsx`, `apps/mobile/app/onboarding/about-you.test.tsx`

**Interfaces:**
- Consumes: `validateTrip` (Task 2), `useSession().refreshProfile` (Task 5), tables `profiles`, `trips`, `licences` (Task 3)
- Produces:
  - `interface OnboardingDraft { fullName: string; phoneE164: string; nationalityIso2: CountryCode; arrival: IsoDate; departure: IsoDate; hasLicence: boolean; issuingCountryIso2?: CountryCode; licenceNumber?: string; expiryDate?: IsoDate; hasIdp: boolean }`
  - `saveOnboarding(userId: string, draft: OnboardingDraft): Promise<{ tripId: string }>` — upserts profile, inserts trip, upserts licence

- [ ] **Step 1: Write failing tests:** `about-you` — "Next" disabled until name non-empty, phone matches `^\+[1-9][0-9]{6,14}$`, nationality chosen; `trip` — choosing departure before arrival shows the `departure_before_arrival` string and disables "Next"; arrival before today shows `arrival_in_past`; `saveOnboarding` calls `profiles.upsert`, `trips.insert`, `licences.upsert` with mapped snake_case columns and returns the new trip id; when `hasLicence` is false, licence number/expiry/issuing country are saved as `null`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** three screens sharing the draft (React context in `onboarding/_layout.tsx`); on finish call `saveOnboarding`, then `refreshProfile()`, then `router.replace('/(tabs)')`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(mobile): onboarding wizard for profile, trip and licence`

---

### Task 7: Trip checklist + request submission with documents

**Files:**
- Create: `apps/mobile/app/(tabs)/index.tsx` (checklist), `apps/mobile/app/request/[type].tsx`
- Create: `apps/mobile/src/checklist/useChecklist.ts`, `apps/mobile/src/checklist/EtaCard.tsx`, `apps/mobile/src/checklist/DrivingCard.tsx`
- Create: `apps/mobile/src/requests/submitRequest.ts`, `apps/mobile/src/requests/uploadDocument.ts`
- Test: `apps/mobile/src/checklist/EtaCard.test.tsx`, `apps/mobile/src/checklist/DrivingCard.test.tsx`, `apps/mobile/src/requests/submitRequest.test.ts`

**Interfaces:**
- Consumes: `assessVisa`, `assessLicence`, `RequestType` (Tasks 1–2); tables from Task 3
- Produces:
  - `useChecklist(): { visa: VisaAssessment; licence: LicenceAssessment; trip: TripRow; openRequests: Partial<Record<RequestType, ServiceRequestRow>> } | null`
  - `uploadDocument(profileId: string, requestId: string, kind: DocumentKind, fileUri: string): Promise<string /* storage_path */>`
  - `submitRequest(args: { profileId: string; tripId: string; type: RequestType; details: Record<string, string>; files: { kind: DocumentKind; uri: string }[] }): Promise<{ requestId: string } | { error: 'already_open' }>`
  - Required files: `eta_application` → `passport`; `driving_permit` → `licence_front`, `licence_back`, `photo`, plus `idp` when `hasIdp`
  - Required details: `eta_application` → `passportNumber`, `passportExpiry`; `driving_permit` → none

- [ ] **Step 1: Write failing tests:** `EtaCard` renders "Free ETA — apply before you fly" for `eta_free`, "ETA required — US$50" for `eta_paid` with 50, the extension warning for `stay_exceeds_eta`, "Our team will check your visa requirements." for `unknown_country`, and never the text "no visa"; button reads "View request" instead of "Get help" when an open request exists. `DrivingCard` renders the route-specific copy for each `LicenceAssessment` and always the tuk-tuk note; no "Get help" button for `no_licence`. `submitRequest` returns `{ error: 'already_open' }` when insert fails with code `23505`; uploads each file to `<profileId>/<requestId>/<kind>-<uuid>.<ext>` and inserts matching `request_documents` rows; ETA submit with passport expiry before departure is rejected before any network call.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Visa rules fetched once from `country_visa_rules` and cached in memory for the session. Images via `expo-image-picker` (camera or library). Submit button disabled while submitting (double-tap guard on top of the DB index).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(mobile): trip checklist and ETA/permit requests with uploads`

---

### Task 8: My Requests + status timeline + push token

**Files:**
- Create: `apps/mobile/app/(tabs)/requests.tsx`, `apps/mobile/app/requests/[id].tsx`
- Create: `apps/mobile/src/requests/useRequests.ts`, `apps/mobile/src/requests/Timeline.tsx`, `apps/mobile/src/push/registerPush.ts`
- Test: `apps/mobile/src/requests/Timeline.test.tsx`, `apps/mobile/app/requests/[id].test.tsx`, `apps/mobile/src/push/registerPush.test.ts`

**Interfaces:**
- Consumes: `nextStatuses`, `isTerminal` (Task 2); `change_request_status` RPC (Task 4); `uploadDocument` (Task 7)
- Produces: `registerPush(profileId: string): Promise<void>` — requests permission, gets Expo push token, upserts `push_tokens`

- [ ] **Step 1: Write failing tests:** `Timeline` lists events oldest-first with status label, time and staff note; request detail shows "Cancel request" only when `nextStatuses(status,'tourist')` includes `cancelled`; when status is `needs_info`, shows upload + "Send to team" which calls `rpc('change_request_status', { p_request_id, p_to_status: 'in_review', p_note })`; `registerPush` does nothing (no throw) when permission is denied.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Detail screen subscribes to Supabase Realtime on `request_events` filtered by `request_id` so the timeline updates live. Call `registerPush` after onboarding and on app start.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(mobile): request list, live status timeline, push registration`

---

### Task 9: Portal scaffold + staff sign-in

**Files:**
- Create: `apps/portal/` via `npx create-next-app@latest apps/portal --ts --app --eslint --src-dir`
- Create: `apps/portal/src/lib/supabase/server.ts`, `apps/portal/src/lib/supabase/client.ts`, `apps/portal/src/middleware.ts`, `apps/portal/src/lib/requireStaff.ts`, `apps/portal/src/strings.ts`
- Create: `apps/portal/src/app/sign-in/page.tsx`, `apps/portal/src/app/(staff)/layout.tsx`
- Create: `apps/portal/.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Test: `apps/portal/src/lib/requireStaff.test.ts`, `apps/portal/e2e/auth.spec.ts`

**Interfaces:**
- Consumes: `staff` table, `is_staff()` (Task 3)
- Produces: `requireStaff(): Promise<{ userId: string; role: 'agent' | 'admin' }>` — server-only; redirects to `/sign-in` without session, to `/sign-in?error=not_staff` when user has no `staff` row

- [ ] **Step 1: Write failing tests:** Vitest for `requireStaff` (mocked client) covering no session, non-staff, agent, admin. Playwright `auth.spec.ts` against local Supabase: seeded demo tourist signing in lands on `/sign-in?error=not_staff`; seeded admin lands on `/inbox`.
- [ ] **Step 2: Run** `pnpm --filter portal test && pnpm --filter portal e2e` → FAIL.
- [ ] **Step 3: Implement** with `@supabase/ssr`; email code sign-in; `(staff)/layout.tsx` calls `requireStaff()`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(portal): scaffold and staff-only sign-in`

---

### Task 10: Portal inbox + request detail + status actions

**Files:**
- Create: `apps/portal/src/app/(staff)/inbox/page.tsx`, `apps/portal/src/app/(staff)/requests/[id]/page.tsx`
- Create: `apps/portal/src/requests/queries.ts`, `apps/portal/src/requests/StatusActions.tsx`, `apps/portal/src/requests/actions.ts`
- Test: `apps/portal/src/requests/queries.test.ts`, `apps/portal/src/requests/StatusActions.test.tsx`, `apps/portal/e2e/request-flow.spec.ts`

**Interfaces:**
- Consumes: `nextStatuses`, `assessVisa`, `assessLicence` (Tasks 1–2); `change_request_status` (Task 4); `requireStaff` (Task 9)
- Produces:
  - `listRequests(filter: { type?: RequestType; status?: RequestStatus[] }): Promise<InboxRow[]>` — default status filter = all non-terminal; ordered `created_at asc`
  - `interface InboxRow { id: string; type: RequestType; status: RequestStatus; touristName: string; nationalityIso2: string; arrivalDate: IsoDate; createdAt: string }`
  - `getRequestDetail(id: string): Promise<{ request; profile; trip; licence; documents: { kind; signedUrl }[]; events }>` — signed URLs valid 10 minutes
  - Server action `changeStatus(formData: FormData)` — fields `requestId`, `toStatus`, `note`; also accepts optional file + `kind` (`eta_approval` / `permit`) uploaded before the status change

- [ ] **Step 1: Write failing tests:** `listRequests` with no filter excludes `completed`/`rejected`/`cancelled` and orders oldest first; `StatusActions` renders exactly the buttons from `nextStatuses(status,'staff')` and requires a note for `needs_info` and `rejected`; Playwright `request-flow.spec.ts`: seeded tourist request appears in inbox → agent opens it, sees passport image link, moves `submitted → in_review → needs_info` with note → timeline shows both events → status in inbox updates.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Detail page shows the visa/driving assessment computed with core so staff see what the tourist saw; fee shown as "To collect: US$X" for paid ETA.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(portal): request inbox, detail and status actions`

---

### Task 11: Visa rules admin

**Files:**
- Create: `apps/portal/src/app/(staff)/visa-rules/page.tsx`, `apps/portal/src/visa-rules/actions.ts`
- Test: `apps/portal/src/visa-rules/actions.test.ts`, `apps/portal/e2e/visa-rules.spec.ts`

**Interfaces:**
- Consumes: `country_visa_rules` (Task 3), `requireStaff` (Task 9)
- Produces: server action `upsertVisaRule(formData)` — fields `countryIso2`, `feeUsd`, `maxStayDays`, `sourceUrl`; sets `verified_on = today (Asia/Colombo)`; requires `role === 'admin'`

- [ ] **Step 1: Write failing tests:** action rejects non-admin; rejects `countryIso2` not matching `^[A-Z]{2}$`, negative fee, `maxStayDays < 1`, non-https `sourceUrl`; Playwright: admin changes a country's fee from 50 to 0 → page shows it as Free; agent sees the table read-only (no edit controls).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**; table sortable by country, shows "verified on" and highlights rows older than 90 days.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(portal): admin editing of country visa rules`

---

### Task 12: Push notification on status change

**Files:**
- Create: `supabase/functions/notify-status/index.ts`, `supabase/functions/notify-status/message.ts`
- Create: `supabase/migrations/20261105000005_notify_webhook.sql` (database webhook on `request_events` insert → function)
- Test: `supabase/functions/notify-status/message.test.ts` (Deno test)

**Interfaces:**
- Consumes: `request_events`, `service_requests`, `push_tokens` (Task 3)
- Produces: `buildMessage(event: { to_status: RequestStatus; note: string | null }, request: { id: string; type: RequestType }): { title: string; body: string; data: { requestId: string } }`

- [ ] **Step 1: Write failing tests:** `buildMessage` for `needs_info` → title "Action needed: ETA application" and body = note; `completed` on `driving_permit` → "Your driving permit is ready"; the initial `submitted` event (from_status null) produces no message (function returns `null`).
- [ ] **Step 2: Run** `deno test supabase/functions/notify-status` → FAIL.
- [ ] **Step 3: Implement** function: load request + tokens with service role, POST to `https://exp.host/--/api/v2/push/send`, delete tokens Expo reports as `DeviceNotRegistered`.
- [ ] **Step 4: Run** → PASS. Manual: change status in portal → push arrives on a dev build.
- [ ] **Step 5: Commit** `feat(push): notify tourists on request status changes`

---

### Task 13: Demo seed, CI and README

**Files:**
- Modify: `supabase/seed.sql` (demo tourists: one free-ETA nationality, one paid, one unknown, one with no licence; requests in each status)
- Create: `README.md`, `.github/workflows/ci.yml`

- [ ] **Step 1:** CI runs `pnpm install`, `pnpm typecheck`, `pnpm test`, `supabase start && supabase test db`, portal Playwright suite.
- [ ] **Step 2:** README: prerequisites (Node 20, pnpm, Docker, Supabase CLI, Expo Go), `supabase start`, copy `.env.example` files, `pnpm --filter portal dev`, `pnpm --filter mobile start`, demo logins.
- [ ] **Step 3: Verify** fresh clone → README steps → full demo (sign up, see checklist, submit ETA request, staff completes it, tourist gets push and sees `completed`).
- [ ] **Step 4: Commit** `chore: demo seed, CI and setup docs`

---

## After M1

Separate spec + plan each, reusing profile, trip and `service_requests`:

- **M2 Itinerary booking** — day-by-day plan, hotel/transfer requests (`type: 'itinerary'`).
- **M3 Activities** — portal-managed catalogue, bookable into itinerary days.
- **M4 Car rental** — self-drive gated on `eligible_for_permit` + completed `driving_permit` request; otherwise car with driver.
- **Payments** — ETA/permit fees and bookings, before public launch.
