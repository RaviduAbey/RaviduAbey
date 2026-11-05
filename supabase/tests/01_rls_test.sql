begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

-- Users: A and B are tourists, C is an agent, D is an admin.
insert into auth.users (id, email) values
  ('b0000000-0000-0000-0000-00000000000a', 'rls-a@test.local'),
  ('b0000000-0000-0000-0000-00000000000b', 'rls-b@test.local'),
  ('b0000000-0000-0000-0000-00000000000c', 'rls-c@test.local'),
  ('b0000000-0000-0000-0000-00000000000d', 'rls-d@test.local');
insert into public.staff (user_id, role) values
  ('b0000000-0000-0000-0000-00000000000c', 'agent'),
  ('b0000000-0000-0000-0000-00000000000d', 'admin');
insert into public.profiles (id, full_name, phone_e164, nationality_iso2) values
  ('b0000000-0000-0000-0000-00000000000a', 'Tourist A', '+447700900001', 'GB'),
  ('b0000000-0000-0000-0000-00000000000b', 'Tourist B', '+447700900002', 'GB');
insert into public.trips (id, profile_id, arrival_date, departure_date) values
  ('b1000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-00000000000a', '2027-01-01', '2027-01-10'),
  ('b1000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', '2027-01-01', '2027-01-10');
insert into public.service_requests (id, profile_id, trip_id, type) values
  ('b2000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-00000000000a', 'b1000000-0000-0000-0000-00000000000a', 'eta_application'),
  ('b2000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'b1000000-0000-0000-0000-00000000000b', 'eta_application');
insert into public.country_visa_rules (country_iso2, fee_usd, max_stay_days, source_url, verified_on)
  values ('XA', 50, 30, 'https://www.eta.gov.lk/', '2026-11-05')
  on conflict (country_iso2) do nothing;
insert into storage.objects (bucket_id, name) values
  ('documents', 'b0000000-0000-0000-0000-00000000000a/b2000000-0000-0000-0000-00000000000a/passport-1.jpg'),
  ('documents', 'b0000000-0000-0000-0000-00000000000b/b2000000-0000-0000-0000-00000000000b/passport-2.jpg');

-- As tourist A
set local role authenticated;
set local request.jwt.claims to '{"sub":"b0000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is((select count(*)::int from public.service_requests), 1, 'tourist sees only their own requests');
select is((select count(*)::int from public.profiles where id = 'b0000000-0000-0000-0000-00000000000b'), 0, 'tourist cannot read another profile');
select is((select count(*)::int from public.trips), 1, 'tourist sees only their own trips');
select throws_ok(
  $$insert into public.country_visa_rules (country_iso2, fee_usd, max_stay_days, source_url, verified_on) values ('XB', 0, 30, 'https://x', '2026-11-05')$$,
  '42501', null, 'tourist cannot add visa rules');
update public.service_requests set status = 'completed' where id = 'b2000000-0000-0000-0000-00000000000a';
select is((select status from public.service_requests where id = 'b2000000-0000-0000-0000-00000000000a'), 'submitted', 'tourist cannot change status directly');
select throws_ok(
  $$insert into public.service_requests (profile_id, trip_id, type) values ('b0000000-0000-0000-0000-00000000000b', 'b1000000-0000-0000-0000-00000000000b', 'driving_permit')$$,
  '42501', null, 'tourist cannot create a request for someone else');
select throws_ok(
  $$insert into public.service_requests (profile_id, trip_id, type) values ('b0000000-0000-0000-0000-00000000000a', 'b1000000-0000-0000-0000-00000000000b', 'driving_permit')$$,
  '42501', null, 'tourist cannot attach a request to someone else''s trip');
select lives_ok(
  $$insert into public.request_documents (request_id, kind, storage_path, uploaded_by) values ('b2000000-0000-0000-0000-00000000000a', 'passport', 'b0000000-0000-0000-0000-00000000000a/b2000000-0000-0000-0000-00000000000a/passport-1.jpg', 'b0000000-0000-0000-0000-00000000000a')$$,
  'tourist can attach a document to their own request');
select throws_ok(
  $$insert into public.request_documents (request_id, kind, storage_path, uploaded_by) values ('b2000000-0000-0000-0000-00000000000a', 'eta_approval', 'b0000000-0000-0000-0000-00000000000a/b2000000-0000-0000-0000-00000000000a/eta_approval-1.pdf', 'b0000000-0000-0000-0000-00000000000a')$$,
  '42501', null, 'tourist cannot attach an approval (staff-only document)');
select throws_ok(
  $$insert into public.request_documents (request_id, kind, storage_path, uploaded_by) values ('b2000000-0000-0000-0000-00000000000a', 'passport', 'b0000000-0000-0000-0000-00000000000b/b2000000-0000-0000-0000-00000000000b/passport-2.jpg', 'b0000000-0000-0000-0000-00000000000a')$$,
  '42501', null, 'tourist cannot point a document at a file outside their request folder');
select throws_ok(
  $$insert into public.request_documents (request_id, kind, storage_path, uploaded_by) values ('b2000000-0000-0000-0000-00000000000b', 'passport', 'b0000000-0000-0000-0000-00000000000b/b2000000-0000-0000-0000-00000000000b/p.jpg', 'b0000000-0000-0000-0000-00000000000a')$$,
  '42501', null, 'tourist cannot attach a document to another request');
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name like 'b000%'), 1, 'tourist sees only their own files');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('documents', 'b0000000-0000-0000-0000-00000000000b/x/evil.jpg')$$,
  '42501', null, 'tourist cannot upload into another tourist''s folder');

-- As agent C
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"b0000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*)::int from public.service_requests where id::text like 'b2%'), 2, 'agent sees every request');
select is((select count(*)::int from storage.objects where bucket_id = 'documents' and name like 'b000%'), 2, 'agent sees every file');
update public.country_visa_rules set fee_usd = 1 where country_iso2 = 'XA';
select is((select fee_usd from public.country_visa_rules where country_iso2 = 'XA'), 50.00::numeric, 'agent cannot edit visa rules');

-- As admin D
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"b0000000-0000-0000-0000-00000000000d","role":"authenticated"}';
update public.country_visa_rules set fee_usd = 0 where country_iso2 = 'XA';
select is((select fee_usd from public.country_visa_rules where country_iso2 = 'XA'), 0.00::numeric, 'admin can edit visa rules');

-- Anonymous
reset role;
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is((select count(*)::int from public.country_visa_rules), 0, 'signed-out visitors cannot read anything');

select * from finish();
rollback;
