begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

-- The trigger reads these two names; set them for this transaction only.
delete from vault.secrets where name in ('notify_status_url', 'notify_webhook_secret');
select vault.create_secret('http://example.invalid/functions/v1/notify-status', 'notify_status_url');
select vault.create_secret('test-secret', 'notify_webhook_secret');

insert into auth.users (id, email) values
  ('d0000000-0000-0000-0000-00000000000a', 'nt-a@test.local'),
  ('d0000000-0000-0000-0000-00000000000c', 'nt-c@test.local');
insert into public.staff (user_id, role) values ('d0000000-0000-0000-0000-00000000000c', 'agent');
insert into public.profiles (id, full_name, phone_e164, nationality_iso2) values
  ('d0000000-0000-0000-0000-00000000000a', 'Tourist A', '+447700900001', 'GB');
insert into public.trips (id, profile_id, arrival_date, departure_date) values
  ('d1000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-00000000000a', '2027-01-01', '2027-01-10');

create temp table queued as select count(*)::int as n from net.http_request_queue;

insert into public.service_requests (id, profile_id, trip_id, type) values
  ('d2000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-00000000000a', 'd1000000-0000-0000-0000-00000000000a', 'eta_application');
select is((select count(*)::int from net.http_request_queue) - (select n from queued), 0, 'no call for the initial submitted event');

set local role authenticated;
set local request.jwt.claims to '{"sub":"d0000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select public.change_request_status('d2000000-0000-0000-0000-000000000001', 'in_review');
reset role;

select is((select count(*)::int from net.http_request_queue) - (select n from queued), 1, 'a status change queues one call');
select ok(
  (select headers->>'x-webhook-secret' = 'test-secret' and url = 'http://example.invalid/functions/v1/notify-status'
     and (convert_from(body, 'utf8')::jsonb)->'record'->>'to_status' = 'in_review'
   from net.http_request_queue order by id desc limit 1),
  'the call carries the secret and the new event');

select * from finish();
rollback;
