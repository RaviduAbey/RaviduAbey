-- Core tables for Milestone 1: tourist profile, trip, licence, visa rules, staff, requests.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) > 0),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  nationality_iso2 char(2) not null check (nationality_iso2 ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  arrival_date date not null,
  departure_date date not null,
  created_at timestamptz not null default now(),
  constraint trips_departure_after_arrival check (departure_date >= arrival_date)
);
create index trips_profile_id_idx on public.trips (profile_id);

create table public.licences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  has_licence boolean not null,
  issuing_country_iso2 char(2) check (issuing_country_iso2 ~ '^[A-Z]{2}$'),
  licence_number text,
  expiry_date date,
  has_idp boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.country_visa_rules (
  country_iso2 char(2) primary key check (country_iso2 ~ '^[A-Z]{2}$'),
  fee_usd numeric(6, 2) not null check (fee_usd >= 0),
  max_stay_days int not null default 30 check (max_stay_days > 0),
  source_url text not null,
  verified_on date not null
);

create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('agent', 'admin')),
  created_at timestamptz not null default now()
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  type text not null check (type in ('eta_application', 'driving_permit')),
  status text not null default 'submitted'
    check (status in ('submitted', 'in_review', 'needs_info', 'completed', 'rejected', 'cancelled')),
  details jsonb not null default '{}'::jsonb,
  assigned_to uuid references public.staff (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index one_open_request_per_type on public.service_requests (trip_id, type)
  where status not in ('completed', 'rejected', 'cancelled');
create index service_requests_profile_id_idx on public.service_requests (profile_id);
create index service_requests_status_created_idx on public.service_requests (status, created_at);

create table public.request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  actor_id uuid not null,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);
create index request_events_request_id_idx on public.request_events (request_id, created_at);

create table public.request_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  kind text not null check (kind in ('passport', 'licence_front', 'licence_back', 'idp', 'photo', 'eta_approval', 'permit')),
  storage_path text not null,
  uploaded_by uuid not null,
  created_at timestamptz not null default now()
);
create index request_documents_request_id_idx on public.request_documents (request_id);

create table public.push_tokens (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  expo_token text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, expo_token)
);

create function public.is_staff() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.staff where user_id = auth.uid()) $$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.staff where user_id = auth.uid() and role = 'admin') $$;
