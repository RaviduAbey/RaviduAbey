-- Local development seed. Runs after migrations on `supabase db reset`.

-- ---------------------------------------------------------------------------
-- Visa rules: STARTER LIST ONLY.
-- These are countries that news reports (May 2026) name as getting the free
-- 30-day tourist ETA. The official list lives on https://www.eta.gov.lk and
-- must be checked by an admin in the portal (Visa rules page) before launch.
-- Any nationality not listed here shows "Our team will check" in the app.
-- ---------------------------------------------------------------------------
insert into public.country_visa_rules (country_iso2, fee_usd, max_stay_days, source_url, verified_on) values
  ('AU', 0, 30, 'https://www.adaderana.lk/news.php?nid=122919', '2026-11-05'),
  ('AT', 0, 30, 'https://www.adaderana.lk/news.php?nid=122919', '2026-11-05'),
  ('BH', 0, 30, 'https://www.adaderana.lk/news.php?nid=122919', '2026-11-05'),
  ('BY', 0, 30, 'https://www.adaderana.lk/news.php?nid=122919', '2026-11-05'),
  ('BE', 0, 30, 'https://www.adaderana.lk/news.php?nid=122919', '2026-11-05'),
  ('CA', 0, 30, 'https://www.adaderana.lk/news.php?nid=122919', '2026-11-05'),
  ('CN', 0, 30, 'https://www.adaderana.lk/news.php?nid=122919', '2026-11-05'),
  ('CZ', 0, 30, 'https://www.adaderana.lk/news.php?nid=122919', '2026-11-05'),
  ('DK', 0, 30, 'https://www.adaderana.lk/news.php?nid=122919', '2026-11-05'),
  ('IN', 0, 30, 'https://www.adaderana.lk/news.php?nid=122919', '2026-11-05'),
  ('ID', 0, 30, 'https://www.adaderana.lk/news.php?nid=122919', '2026-11-05'),
  ('JP', 0, 30, 'https://www.adaderana.lk/news.php?nid=122919', '2026-11-05'),
  ('MY', 0, 30, 'https://www.adaderana.lk/news.php?nid=122919', '2026-11-05'),
  ('RU', 0, 30, 'https://www.adaderana.lk/news.php?nid=122919', '2026-11-05'),
  ('TH', 0, 30, 'https://www.adaderana.lk/news.php?nid=122919', '2026-11-05')
on conflict (country_iso2) do nothing;

-- ---------------------------------------------------------------------------
-- Demo accounts (sign in with the email; the 6-digit code arrives in Mailpit
-- at http://127.0.0.1:54324).
--   admin@example.test   staff, admin (can edit visa rules)
--   agent@example.test   staff, agent
--   anna@example.test    tourist with a trip and licence
-- ---------------------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('00000000-0000-4000-a000-0000000000ad'::uuid, 'admin@example.test'),
      ('00000000-0000-4000-a000-0000000000a6'::uuid, 'agent@example.test'),
      ('00000000-0000-4000-a000-00000000a001'::uuid, 'anna@example.test')
    ) as t(id, email)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '', now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text,
            jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now(), now());
  end loop;
end $$;

insert into public.staff (user_id, role) values
  ('00000000-0000-4000-a000-0000000000ad', 'admin'),
  ('00000000-0000-4000-a000-0000000000a6', 'agent');

insert into public.profiles (id, full_name, phone_e164, nationality_iso2) values
  ('00000000-0000-4000-a000-00000000a001', 'Anna Demo', '+61400000001', 'AU');
insert into public.trips (id, profile_id, arrival_date, departure_date) values
  ('00000000-0000-4000-b000-00000000a001', '00000000-0000-4000-a000-00000000a001', '2027-01-12', '2027-02-02');
insert into public.licences (profile_id, has_licence, issuing_country_iso2, licence_number, expiry_date, has_idp) values
  ('00000000-0000-4000-a000-00000000a001', true, 'AU', 'DEMO-123456', '2030-06-30', true);

-- ---------------------------------------------------------------------------
-- Demo tourists and requests (new, in review, waiting on tourist, completed) so the portal has
-- something to show. (Anna's ETA is left free for the portal e2e tests.)
--   ben@example.test   United Kingdom: not in the starter visa list -> "team will check"; no IDP -> DMT permit
--   chen@example.test  China: free ETA but a 45-day stay -> extension warning; no licence
-- ---------------------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('00000000-0000-4000-a000-00000000b001'::uuid, 'ben@example.test'),
      ('00000000-0000-4000-a000-00000000c001'::uuid, 'chen@example.test')
    ) as t(id, email)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '', now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text,
            jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now(), now());
  end loop;
end $$;

insert into public.profiles (id, full_name, phone_e164, nationality_iso2) values
  ('00000000-0000-4000-a000-00000000b001', 'Ben Walker', '+447700900123', 'GB'),
  ('00000000-0000-4000-a000-00000000c001', 'Chen Li', '+8613800000001', 'CN');
insert into public.trips (id, profile_id, arrival_date, departure_date) values
  ('00000000-0000-4000-b000-00000000b001', '00000000-0000-4000-a000-00000000b001', '2027-02-03', '2027-02-17'),
  ('00000000-0000-4000-b000-00000000c001', '00000000-0000-4000-a000-00000000c001', '2027-03-01', '2027-04-14');
insert into public.licences (profile_id, has_licence, issuing_country_iso2, licence_number, expiry_date, has_idp) values
  ('00000000-0000-4000-a000-00000000b001', true, 'GB', 'WALKE801013B99XY', '2031-04-30', false),
  ('00000000-0000-4000-a000-00000000c001', false, null, null, null, false);

-- Requests start as submitted (the trigger records that event); later steps are added below.
insert into public.service_requests (id, profile_id, trip_id, type, details, created_at) values
  ('00000000-0000-4000-c000-00000000b0e1', '00000000-0000-4000-a000-00000000b001', '00000000-0000-4000-b000-00000000b001', 'eta_application',
   '{"passportNumber":"533380001","passportExpiry":"2030-08-01"}', now() - interval '3 hours'),
  ('00000000-0000-4000-c000-00000000b0d1', '00000000-0000-4000-a000-00000000b001', '00000000-0000-4000-b000-00000000b001', 'driving_permit',
   '{}', now() - interval '2 days'),
  ('00000000-0000-4000-c000-00000000c0e1', '00000000-0000-4000-a000-00000000c001', '00000000-0000-4000-b000-00000000c001', 'eta_application',
   '{"passportNumber":"E12345678","passportExpiry":"2032-01-15"}', now() - interval '1 day'),
  ('00000000-0000-4000-c000-00000000a0d1', '00000000-0000-4000-a000-00000000a001', '00000000-0000-4000-b000-00000000a001', 'driving_permit',
   '{}', now() - interval '6 days');
update public.request_events set created_at = r.created_at
  from public.service_requests r where r.id = request_events.request_id;

-- Ben's permit: the team asked for the back of his licence.
update public.service_requests set status = 'needs_info' where id = '00000000-0000-4000-c000-00000000b0d1';
insert into public.request_events (request_id, actor_id, from_status, to_status, note, created_at) values
  ('00000000-0000-4000-c000-00000000b0d1', '00000000-0000-4000-a000-0000000000a6', 'submitted', 'in_review', null, now() - interval '1 day 20 hours'),
  ('00000000-0000-4000-c000-00000000b0d1', '00000000-0000-4000-a000-0000000000a6', 'in_review', 'needs_info',
   'Please add a photo of the back of your licence.', now() - interval '1 day 19 hours');

-- Chen's ETA: in review.
update public.service_requests set status = 'in_review' where id = '00000000-0000-4000-c000-00000000c0e1';
insert into public.request_events (request_id, actor_id, from_status, to_status, note, created_at) values
  ('00000000-0000-4000-c000-00000000c0e1', '00000000-0000-4000-a000-0000000000a6', 'submitted', 'in_review',
   'Your stay is 45 days. We will apply for the ETA and advise on extending it.', now() - interval '20 hours');

-- Anna's permit: completed.
update public.service_requests set status = 'completed' where id = '00000000-0000-4000-c000-00000000a0d1';
insert into public.request_events (request_id, actor_id, from_status, to_status, note, created_at) values
  ('00000000-0000-4000-c000-00000000a0d1', '00000000-0000-4000-a000-0000000000a6', 'submitted', 'in_review', null, now() - interval '5 days'),
  ('00000000-0000-4000-c000-00000000a0d1', '00000000-0000-4000-a000-0000000000ad', 'in_review', 'completed',
   'Your AA Ceylon recognition permit is ready. Collect it at the AA Ceylon desk in the airport arrivals hall.', now() - interval '4 days');

-- ---------------------------------------------------------------------------
-- Push notifications (local): the request_events trigger calls the
-- notify-status edge function through the local API gateway.
-- ---------------------------------------------------------------------------
select vault.create_secret('http://supabase_kong_RaviduAbey:8000/functions/v1/notify-status', 'notify_status_url');
select vault.create_secret('local-dev-notify-secret', 'notify_webhook_secret');
