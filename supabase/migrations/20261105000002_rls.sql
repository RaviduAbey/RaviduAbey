-- Row-level security: tourists see only their own rows; staff see all; admins edit visa rules.

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.licences enable row level security;
alter table public.country_visa_rules enable row level security;
alter table public.staff enable row level security;
alter table public.service_requests enable row level security;
alter table public.request_events enable row level security;
alter table public.request_documents enable row level security;
alter table public.push_tokens enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- trips
create policy trips_select on public.trips for select to authenticated
  using (profile_id = auth.uid() or public.is_staff());
create policy trips_insert on public.trips for insert to authenticated
  with check (profile_id = auth.uid());
create policy trips_update on public.trips for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- licences
create policy licences_select on public.licences for select to authenticated
  using (profile_id = auth.uid() or public.is_staff());
create policy licences_insert on public.licences for insert to authenticated
  with check (profile_id = auth.uid());
create policy licences_update on public.licences for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- country_visa_rules
create policy visa_rules_select on public.country_visa_rules for select to authenticated using (true);
create policy visa_rules_insert on public.country_visa_rules for insert to authenticated with check (public.is_admin());
create policy visa_rules_update on public.country_visa_rules for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy visa_rules_delete on public.country_visa_rules for delete to authenticated using (public.is_admin());

-- staff
create policy staff_select on public.staff for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- service_requests: tourists create their own; nobody updates directly (see change_request_status).
create policy requests_select on public.service_requests for select to authenticated
  using (profile_id = auth.uid() or public.is_staff());
create policy requests_insert on public.service_requests for insert to authenticated
  with check (
    profile_id = auth.uid()
    and status = 'submitted'
    and exists (select 1 from public.trips t where t.id = trip_id and t.profile_id = auth.uid())
  );

-- request_events: read-only to clients; written by change_request_status and triggers.
create policy events_select on public.request_events for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.service_requests r where r.id = request_id and r.profile_id = auth.uid())
  );

-- request_documents
create policy documents_select on public.request_documents for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.service_requests r where r.id = request_id and r.profile_id = auth.uid())
  );
create policy documents_insert on public.request_documents for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      public.is_staff()
      or exists (select 1 from public.service_requests r where r.id = request_id and r.profile_id = auth.uid())
    )
  );

-- push_tokens
create policy push_tokens_select on public.push_tokens for select to authenticated using (profile_id = auth.uid());
create policy push_tokens_insert on public.push_tokens for insert to authenticated with check (profile_id = auth.uid());
create policy push_tokens_delete on public.push_tokens for delete to authenticated using (profile_id = auth.uid());
