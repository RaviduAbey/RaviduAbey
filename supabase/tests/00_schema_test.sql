begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select has_table('public', 'profiles', 'profiles table');
select has_table('public', 'trips', 'trips table');
select has_table('public', 'licences', 'licences table');
select has_table('public', 'country_visa_rules', 'country_visa_rules table');
select has_table('public', 'staff', 'staff table');
select has_table('public', 'service_requests', 'service_requests table');
select has_table('public', 'request_events', 'request_events table');
select has_table('public', 'request_documents', 'request_documents table');
select has_table('public', 'push_tokens', 'push_tokens table');

insert into auth.users (id, email) values ('a0000000-0000-0000-0000-000000000001', 'schema-a@test.local');
insert into public.profiles (id, full_name, phone_e164, nationality_iso2)
  values ('a0000000-0000-0000-0000-000000000001', 'Schema A', '+491701234567', 'DE');

select throws_ok(
  $$insert into public.trips (profile_id, arrival_date, departure_date)
    values ('a0000000-0000-0000-0000-000000000001', '2027-01-10', '2027-01-05')$$,
  '23514', null, 'departure before arrival is rejected');

insert into public.trips (id, profile_id, arrival_date, departure_date)
  values ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '2027-01-01', '2027-01-10');
insert into public.service_requests (id, profile_id, trip_id, type)
  values ('a2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'eta_application');

select throws_ok(
  $$insert into public.service_requests (profile_id, trip_id, type)
    values ('a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'eta_application')$$,
  '23505', null, 'second open request of the same type for a trip is refused');

update public.service_requests set status = 'cancelled' where id = 'a2000000-0000-0000-0000-000000000001';

select lives_ok(
  $$insert into public.service_requests (profile_id, trip_id, type)
    values ('a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'eta_application')$$,
  'new request allowed once the earlier one is cancelled');

select lives_ok(
  $$insert into public.service_requests (profile_id, trip_id, type)
    values ('a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'driving_permit')$$,
  'a different request type can be open at the same time');

select * from finish();
rollback;
