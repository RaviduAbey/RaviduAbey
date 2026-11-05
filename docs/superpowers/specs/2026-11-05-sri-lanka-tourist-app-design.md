# Sri Lanka Tourist App + Operations Portal — Design

Status: draft for review · 2026-11-05

## Intent

Tourists from any country planning a trip to Sri Lanka install a mobile app,
create a profile, and immediately learn two things: what they need to do about
their visa (ETA), and whether they can legally drive here. If they need help,
they request it in the app. Every request lands in a web portal where the
operations team works it through to completion, and the tourist sees progress in
the app.

Later milestones add itinerary booking, activities, and car rental on top of the
same profile and request pipeline.

## Facts the design rests on (verify before launch)

- **Almost every visitor needs an ETA.** Since 25 May 2026 nationals of 40
  countries get a *free* 30-day tourist ETA, but must still apply before
  arrival. Others pay (≈ US$20 SAARC, ≈ US$50 everyone else). The official list
  is on eta.gov.lk. → The app answers "free or paid ETA, and do you want us to
  apply for you?", never "no visa needed".
- **The ETA is a government system.** The app cannot issue one. The portal team
  applies on eta.gov.lk on the tourist's behalf and uploads the approval.
- **An International Driving Permit (IDP) is issued only by the country that
  issued the home licence.** It cannot be requested from Sri Lanka. What can be
  obtained locally is a Sri Lankan permit: AA Ceylon recognition permit (needs
  IDP) or a DMT temporary permit. Three-wheelers (tuk-tuks) need separate
  authorisation. Sources disagree on details — confirm with DMT / AA Ceylon.
- **Visa depends on passport nationality, not "the country you're coming
  from".** The profile stores nationality separately from the licence's issuing
  country.

## Goals (Milestone 1 — this prototype)

1. Tourist sign-up: name, phone, email, nationality, driving licence details,
   arrival and departure dates.
2. Instant ETA assessment from a country rules table the team can edit.
3. Instant driving assessment from licence details.
4. Tourist can request (a) ETA application assistance, (b) a Sri Lankan driving
   permit, with document uploads.
5. Portal: staff inbox of requests, detail view with tourist profile and
   documents, status changes with notes.
6. Tourist sees each request's status timeline and gets a push notification on
   every status change.

## Non-goals (M1)

- Payments / fee collection (portal shows fee "to be collected"; handled
  offline).
- Submitting to eta.gov.lk automatically. Staff do it by hand.
- Itinerary, activities, car rental (M2–M4 below).
- Multiple languages (English only for M1, strings kept in one file per app).

## Anti-goals

- Telling a tourist they need nothing when they actually need an ETA, or that
  they can drive when they can't. When the rules are unknown, the app says
  "our team will check" and does not guess.
- One tourist ever seeing another tourist's passport or licence.

## Approaches considered

| Approach | Trade-off | Verdict |
|---|---|---|
| **A. Expo app + Next.js portal + Supabase** (Postgres, Auth, Storage, row-level security, Edge Functions) | No custom server to run; auth, file storage and per-user access rules built-in; one TypeScript codebase | **Chosen** (Claude's call — user deferred the how) |
| B. Expo + Next.js + custom Node API (Fastify + Prisma + Postgres + S3) | Full control, but auth, upload, access control and admin all hand-built — weeks more for a prototype | Rejected for M1 |
| C. Low-code (FlutterFlow / Bubble + Airtable) | Fastest demo, but hits a wall on access control for passports and on later booking logic | Rejected |

## Architecture

```
apps/mobile   Expo (React Native, Expo Router)  — tourists
apps/portal   Next.js (App Router)              — staff
packages/core Pure TypeScript: rules, types, status machine (shared, unit-tested)
supabase/     migrations, seed, pgTAP tests, edge functions
```

- **Auth:** Supabase email one-time code for tourists and staff (free; phone is
  stored as a profile field, SMS OTP deferred — Claude's call to avoid SMS cost
  in the prototype). Staff are users with a row in `staff`.
- **Data (Postgres):** `profiles`, `trips`, `licences`, `country_visa_rules`,
  `service_requests`, `request_events`, `request_documents`, `staff`,
  `push_tokens`.
- **Access:** row-level security — a tourist reads/writes only their own rows;
  staff read all requests and documents; only admins edit visa rules.
- **Documents:** private Storage bucket `documents`, path
  `<profile_id>/<request_id>/<kind>-<uuid>.<ext>`; portal views via signed URLs.
- **Status changes:** only through the Postgres function
  `change_request_status`, which validates the transition and writes a
  `request_events` row. A database webhook on `request_events` insert calls the
  `notify-status` Edge Function, which sends an Expo push.

### Request lifecycle

```
submitted ──staff──▶ in_review ──staff──▶ completed
    │                  │  ▲   └──staff──▶ rejected
 tourist            staff  tourist/staff
    ▼                  ▼  │
 cancelled ◀─tourist─ needs_info
```

Terminal: `completed`, `rejected`, `cancelled`. At most one open request per
type per trip.

### Assessments (in `packages/core`)

- **Visa:** look up nationality in `country_visa_rules` (`fee_usd`, `max_stay_days`).
  Result: `eta_free`, `eta_paid`, `stay_exceeds_eta` (trip longer than the
  ETA allows → team must advise on extension), or `unknown_country`.
  Stay length = calendar days from arrival to departure, inclusive.
- **Driving:** `no_licence` (offer car-with-driver later), `licence_expires_during_trip`,
  or `eligible_for_permit` with route `aa_ceylon_recognition` (has IDP) or
  `dmt_temporary_permit` (no IDP). Always shows the tuk-tuk note.

## Screens

Mobile:
1. Welcome → email → 6-digit code
2. Onboarding wizard: (a) name, phone, nationality · (b) arrival, departure ·
   (c) licence: has licence? issuing country, number, expiry, has IDP?
3. "Your trip checklist": ETA card + Driving card, each with a "Get help" button
4. Request form: type-specific fields + document uploads → submit
5. My requests: list → detail with status timeline and staff notes; reply/upload
   when status is `needs_info`

Portal:
1. Staff sign-in
2. Inbox: table filtered by type and status, oldest open first, shows tourist,
   nationality, arrival date, age of request
3. Request detail: tourist profile, trip, licence, assessment, documents,
   timeline, status buttons (only legal transitions) with note
4. Visa rules (admin): table of countries, fee, max stay, source URL,
   "verified on" date

## Later milestones (each gets its own spec + plan)

Shareable overview with journey map: https://claude.ai/artifact/DDTMX3jwe7uGq5tkeBibmM

### M2 Itinerary booking
- Tourist: picks interests (beaches, culture, wildlife, tea country), pace,
  budget, group size; starts from a route template (e.g. 7-day Cultural
  Triangle, 10-day south coast); swaps hotels, reorders days; asks for a
  custom plan; views plan offline.
- Team: maintains route templates and partner hotels/rates; quotes custom
  plans (tourist accepts in app); books inter-city transfers; handles
  mid-trip changes.
- Builds on: M1 trip dates; `service_requests` type `itinerary`.
- Open: instant booking vs. quote-first; own hotel partners vs. reselling.

### M3 Activities
- Tourist: browses by place/date/interest (safari, whale watching, Ella
  train, Sigiriya, cooking class, surfing); sees price, duration, pickup;
  adds to an itinerary day; gets a voucher; seasonal warnings (south-coast
  whale season Nov–Apr, Yala annual closure).
- Team: manages providers, activities, time slots and capacity; confirms
  bookings; sends pickup times.
- Builds on: M2 itinerary days and hotel locations.
- Open: launch catalogue; markup vs. provider commission.

### M4 Car rental
- Tourist: self-drive, car with driver, or tuk-tuk; vehicle size, dates
  within trip, airport/hotel pickup, child seat; sees driver details.
- Self-drive offered only when the driving assessment is
  `eligible_for_permit` and the `driving_permit` request is `completed`;
  otherwise car with driver.
- Team: fleet or partner companies, availability calendar, assign vehicle
  and driver, handover/return record with photos, deposits (after M5).
- Open: own fleet vs. partners; car-with-driver as default; tuk-tuks at all.

### M5 Payments & launch
- Card payments for every service, USD and LKR display, receipts, refunds.
  Gateway must support a Sri Lankan business (e.g. PayHere or a bank
  gateway; Stripe does not).
- App Store / Google Play, privacy policy under Sri Lanka's Personal Data
  Protection Act (passports stored), in-app help line (possibly WhatsApp),
  post-trip ratings, more languages.
- Open: which languages first; whether ETA fees move into M1.

### Possible M6: During the trip
Emergency line, local SIM, currency tips, chat with the team.

## Left to the builder

UI styling, component library, form library, country list source (ISO 3166
alpha-2), date picker choice.
