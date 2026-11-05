# Lanka Ready — Sri Lanka Tourist App (prototype)

A mobile app that gets visitors ready for Sri Lanka before they land, and a web portal where the operations team handles what they ask for.

This is **Milestone 1** of the plan: sign-up, visa (ETA) and driving checks, help requests with document uploads, and the staff portal. Later milestones (itinerary, activities, car rental, payments) are outlined in the design doc.

- Design: [`docs/superpowers/specs/2026-11-05-sri-lanka-tourist-app-design.md`](docs/superpowers/specs/2026-11-05-sri-lanka-tourist-app-design.md)
- Build plan: [`docs/superpowers/plans/2026-11-05-m1-onboarding-and-requests.md`](docs/superpowers/plans/2026-11-05-m1-onboarding-and-requests.md)

> "Lanka Ready" is a placeholder name. Change it in `apps/mobile/app.json`, `apps/mobile/src/strings.ts` and `apps/portal/src/strings.ts`.

## Clickable demo (no setup)

`demo/index.html` is a single-file, clickable version of the tourist app and staff portal, wired together with demo data stored in the browser. Open it in any browser. Add `#app` to the address to show only the phone app (good for showing on a phone) or `#portal` for only the portal. It is for showing the idea. The real apps below use the real database.

## What it does

**Tourist app** (`apps/mobile`, Expo / React Native)

1. Sign in with an email code.
2. Three sign-up steps: name, phone and passport nationality; arrival and departure dates; driving licence and IDP.
3. **My trip** checklist:
   - **Visa**: free ETA, paid ETA (with fee), stay longer than the ETA allows, or "our team will check" when the nationality isn't in the list. It never says "no visa needed".
   - **Driving**: no licence, licence expires during the trip, AA Ceylon recognition permit (has IDP) or DMT temporary permit (no IDP). The tuk-tuk note is always shown.
4. **Get help**: send an ETA or driving-permit request with photos of passport and licence.
5. **Requests** tab: live status timeline, staff notes, reply with a new photo when the team asks, open the approval when it's done. A phone notification arrives on every status change.

**Operations portal** (`apps/portal`, Next.js)

- Staff-only sign-in (email code). Tourist accounts are turned away.
- **Inbox**: open requests, oldest first, filter by type and status.
- **Request page**: tourist details, what the app told them, document thumbnails, timeline, and only the status buttons allowed from the current status. A note is required when asking for info or rejecting. The ETA approval or permit can be attached when completing.
- **Visa rules** (admins edit, agents view): fee and maximum stay per nationality, source link, and the date it was checked. Rules older than 90 days are flagged.

**Backend** (`supabase/`): Postgres with row-level security (a tourist can only ever see their own data and files), private document storage, a single `change_request_status` function that enforces the allowed status moves and writes the timeline, and the `notify-status` edge function for push notifications.

## Before launch: facts to confirm

- **Visa list.** The seed contains only 15 countries that news reports (May 2026) name as getting the free 30-day ETA. Check the official list on [eta.gov.lk](https://www.eta.gov.lk) and complete it under **Visa rules** in the portal. Fees for other countries (about US$20 for SAARC and US$50 for everyone else) must be entered there too.
- **Driving permits.** Confirm the AA Ceylon and Department of Motor Traffic rules. Sources disagree.
- **Payments** are not in this milestone. The portal shows the fee to collect.

## Project layout

```
apps/mobile      Expo app for tourists (iOS, Android, web for demos)
apps/portal      Next.js staff portal
packages/core    Shared rules: visa and licence checks, trip dates, status moves, country list, DB types
supabase/        Migrations, seed, database tests, notify-status edge function
docs/superpowers Design and build plan
```

## Run it locally

You need **Node 20+**, **pnpm 10**, **Docker**, the **Supabase CLI** and (for phones) the **Expo Go** app.

```bash
pnpm install
supabase start          # local database, auth, storage, email inbox
supabase status         # shows the API URL and anon key
```

Copy the env files and paste the anon key from `supabase status` into both:

```bash
cp apps/portal/.env.example apps/portal/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

Then start the two apps:

```bash
pnpm --filter portal dev       # http://localhost:3000
pnpm --filter mobile start     # scan the QR code with Expo Go, or press w for web
```

For a phone on the same Wi-Fi, set `EXPO_PUBLIC_SUPABASE_URL` in `apps/mobile/.env` to your computer's network address (for example `http://192.168.1.20:54321`) instead of `127.0.0.1`.

**Sign-in codes** are emailed to the local inbox at <http://127.0.0.1:54324>.

### Demo accounts

| Email | Who | What you'll see |
|---|---|---|
| `admin@example.test` | Staff, admin | Portal, can edit visa rules |
| `agent@example.test` | Staff, agent | Portal, visa rules read-only |
| `anna@example.test` | Tourist, Australia | Free ETA; IDP, so AA Ceylon permit (completed) |
| `ben@example.test` | Tourist, United Kingdom | Not in starter visa list, so "team will check"; permit waiting on him |
| `chen@example.test` | Tourist, China | 45-day stay, longer than the free ETA; no licence |

Any other email can sign up as a new tourist in the app.

## Tests

```bash
pnpm typecheck                                  # all packages
pnpm test                                       # core (Vitest), mobile (Jest), portal (Vitest)
supabase test db                                # database rules, access control, status moves, push trigger
deno test --allow-net=jsr.io supabase/functions # push notification function
pnpm --filter portal e2e                        # portal in a real browser (needs `supabase start`)
```

GitHub Actions runs all of these on every push (`.github/workflows/ci.yml`).

## Going to production

1. Create a Supabase project, then `supabase link` and `supabase db push`.
2. Deploy the function: `supabase functions deploy notify-status` and `supabase secrets set NOTIFY_WEBHOOK_SECRET=<random string>`.
3. In the SQL editor, store the function URL and the same secret in Vault:
   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/notify-status', 'notify_status_url');
   select vault.create_secret('<the same random string>', 'notify_webhook_secret');
   ```
4. Set the auth email templates (magic link and confirmation) to show `{{ .Token }}`, as in `supabase/templates/otp.html`.
5. Add staff: create their user, then `insert into public.staff (user_id, role) values ('<user id>', 'admin');`.
6. Mobile: run `npx eas-cli init` in `apps/mobile` (push tokens need an Expo project ID), then build with EAS.
7. Deploy the portal (for example on Vercel) with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Known limits of this prototype

- English only; no payments.
- Staff apply on eta.gov.lk by hand; nothing is submitted automatically.
- On the web build of the tourist app, dates are typed as `YYYY-MM-DD`. Phones get a date picker.
