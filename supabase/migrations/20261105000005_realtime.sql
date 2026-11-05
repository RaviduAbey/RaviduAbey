-- Let the app receive new timeline events live (row-level security still applies).
alter publication supabase_realtime add table public.request_events;
