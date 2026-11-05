-- The only way to change a request's status. Mirrors TRANSITIONS in packages/core/src/requests.ts.

create table public.request_status_transitions (
  from_status text not null,
  to_status text not null,
  actor_role text not null check (actor_role in ('tourist', 'staff')),
  primary key (from_status, to_status, actor_role)
);
alter table public.request_status_transitions enable row level security;
create policy transitions_select on public.request_status_transitions for select to authenticated using (true);

insert into public.request_status_transitions (from_status, to_status, actor_role) values
  ('submitted', 'in_review', 'staff'),
  ('submitted', 'cancelled', 'tourist'),
  ('in_review', 'needs_info', 'staff'),
  ('in_review', 'completed', 'staff'),
  ('in_review', 'rejected', 'staff'),
  ('needs_info', 'in_review', 'staff'),
  ('needs_info', 'in_review', 'tourist'),
  ('needs_info', 'cancelled', 'tourist');

create function public.change_request_status(p_request_id uuid, p_to_status text, p_note text default null)
returns public.service_requests
language plpgsql security definer set search_path = ''
as $$
declare
  v_request public.service_requests;
  v_role text;
  v_from text;
begin
  select * into v_request from public.service_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found' using errcode = '42501';
  end if;

  if public.is_staff() then
    v_role := 'staff';
  elsif v_request.profile_id = auth.uid() then
    v_role := 'tourist';
  else
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.request_status_transitions
    where from_status = v_request.status and to_status = p_to_status and actor_role = v_role
  ) then
    raise exception 'illegal_transition' using errcode = 'P0001',
      detail = format('%s cannot move %s -> %s', v_role, v_request.status, p_to_status);
  end if;

  v_from := v_request.status;

  update public.service_requests
    set status = p_to_status, updated_at = now()
    where id = p_request_id
    returning * into v_request;

  insert into public.request_events (request_id, actor_id, from_status, to_status, note)
  values (p_request_id, auth.uid(), v_from, p_to_status, nullif(btrim(p_note), ''));

  return v_request;
end;
$$;

revoke execute on function public.change_request_status(uuid, text, text) from public, anon;
grant execute on function public.change_request_status(uuid, text, text) to authenticated;

-- Every new request starts its timeline with a 'submitted' event.
create function public.log_request_created() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.request_events (request_id, actor_id, from_status, to_status)
  values (new.id, coalesce(auth.uid(), new.profile_id), null, new.status);
  return new;
end;
$$;

create trigger service_requests_log_created
  after insert on public.service_requests
  for each row execute function public.log_request_created();
