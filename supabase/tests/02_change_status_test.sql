begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, email) values
  ('c0000000-0000-0000-0000-00000000000a', 'cs-a@test.local'),
  ('c0000000-0000-0000-0000-00000000000b', 'cs-b@test.local'),
  ('c0000000-0000-0000-0000-00000000000c', 'cs-c@test.local');
insert into public.staff (user_id, role) values ('c0000000-0000-0000-0000-00000000000c', 'agent');
insert into public.profiles (id, full_name, phone_e164, nationality_iso2) values
  ('c0000000-0000-0000-0000-00000000000a', 'Tourist A', '+447700900001', 'GB'),
  ('c0000000-0000-0000-0000-00000000000b', 'Tourist B', '+447700900002', 'GB');
insert into public.trips (id, profile_id, arrival_date, departure_date) values
  ('c1000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000a', '2027-01-01', '2027-01-10');

-- Tourist A creates two requests (as themselves, so the initial event records them).
set local role authenticated;
set local request.jwt.claims to '{"sub":"c0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.service_requests (id, profile_id, trip_id, type) values
  ('c2000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000a', 'c1000000-0000-0000-0000-00000000000a', 'eta_application'),
  ('c2000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000000a', 'c1000000-0000-0000-0000-00000000000a', 'driving_permit');

select results_eq(
  $$select actor_id::text, from_status, to_status from public.request_events where request_id = 'c2000000-0000-0000-0000-000000000001'$$,
  $$values ('c0000000-0000-0000-0000-00000000000a', null::text, 'submitted')$$,
  'creating a request records a submitted event by the tourist');

select throws_ok($$select public.change_request_status('c2000000-0000-0000-0000-000000000001', 'completed')$$,
  'P0001', 'illegal_transition', 'tourist cannot complete a request');
select throws_ok($$select public.change_request_status('c2000000-0000-0000-0000-000000000001', 'in_review')$$,
  'P0001', 'illegal_transition', 'tourist cannot start review');

-- Tourist B cannot touch A's request.
set local request.jwt.claims to '{"sub":"c0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select throws_ok($$select public.change_request_status('c2000000-0000-0000-0000-000000000001', 'cancelled')$$,
  '42501', null, 'another tourist cannot change the request');

-- Staff walk request 1: submitted -> in_review -> needs_info
set local request.jwt.claims to '{"sub":"c0000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$select public.change_request_status('c2000000-0000-0000-0000-000000000001', 'completed')$$,
  'P0001', 'illegal_transition', 'staff cannot skip review');
select is((public.change_request_status('c2000000-0000-0000-0000-000000000001', 'in_review', 'Looking at it')).status,
  'in_review', 'staff: submitted -> in_review');
select is((public.change_request_status('c2000000-0000-0000-0000-000000000001', 'needs_info', 'Passport photo is blurry')).status,
  'needs_info', 'staff: in_review -> needs_info');
select results_eq(
  $$select actor_id::text, from_status, to_status, note from public.request_events
    where request_id = 'c2000000-0000-0000-0000-000000000001' and from_status = 'in_review'$$,
  $$values ('c0000000-0000-0000-0000-00000000000c', 'in_review'::text, 'needs_info'::text, 'Passport photo is blurry'::text)$$,
  'status change writes an event with actor, from, to and note');

-- Tourist answers: needs_info -> in_review
set local request.jwt.claims to '{"sub":"c0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((public.change_request_status('c2000000-0000-0000-0000-000000000001', 'in_review', 'New photo uploaded')).status,
  'in_review', 'tourist: needs_info -> in_review');

-- Staff: in_review -> needs_info -> in_review (staff) -> completed
set local request.jwt.claims to '{"sub":"c0000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((public.change_request_status('c2000000-0000-0000-0000-000000000001', 'needs_info', 'One more thing')).status,
  'needs_info', 'staff: in_review -> needs_info again');
select is((public.change_request_status('c2000000-0000-0000-0000-000000000001', 'in_review')).status,
  'in_review', 'staff: needs_info -> in_review');
select is((public.change_request_status('c2000000-0000-0000-0000-000000000001', 'completed', 'ETA approved')).status,
  'completed', 'staff: in_review -> completed');
select throws_ok($$select public.change_request_status('c2000000-0000-0000-0000-000000000001', 'in_review')$$,
  'P0001', 'illegal_transition', 'completed is terminal');
select is((select count(*)::int from public.request_events where request_id = 'c2000000-0000-0000-0000-000000000001'), 7,
  'one event per change plus the initial one');

-- Request 2: tourist cancels from submitted; then staff reject path on a fresh request.
set local request.jwt.claims to '{"sub":"c0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((public.change_request_status('c2000000-0000-0000-0000-000000000002', 'cancelled')).status,
  'cancelled', 'tourist: submitted -> cancelled');
insert into public.service_requests (id, profile_id, trip_id, type) values
  ('c2000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-00000000000a', 'c1000000-0000-0000-0000-00000000000a', 'driving_permit');
set local request.jwt.claims to '{"sub":"c0000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((public.change_request_status('c2000000-0000-0000-0000-000000000003', 'in_review')).status, 'in_review', 'staff: review permit');
select is((public.change_request_status('c2000000-0000-0000-0000-000000000003', 'rejected', 'Licence expired')).status,
  'rejected', 'staff: in_review -> rejected');
select throws_ok($$select public.change_request_status('c2000000-0000-0000-0000-000000000003', 'cancelled')$$,
  'P0001', 'illegal_transition', 'rejected is terminal');

-- Tourist can cancel while needs_info
set local request.jwt.claims to '{"sub":"c0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.service_requests (id, profile_id, trip_id, type) values
  ('c2000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-00000000000a', 'c1000000-0000-0000-0000-00000000000a', 'eta_application');
set local request.jwt.claims to '{"sub":"c0000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select public.change_request_status('c2000000-0000-0000-0000-000000000004', 'in_review');
select public.change_request_status('c2000000-0000-0000-0000-000000000004', 'needs_info', 'Need passport');
set local request.jwt.claims to '{"sub":"c0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((public.change_request_status('c2000000-0000-0000-0000-000000000004', 'cancelled')).status,
  'cancelled', 'tourist: needs_info -> cancelled');

select * from finish();
rollback;
