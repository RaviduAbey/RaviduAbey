-- Tell the notify-status edge function about every status change, so it can push to the tourist's phone.
-- The function URL and shared secret live in Vault:
--   select vault.create_secret('https://<project>.supabase.co/functions/v1/notify-status', 'notify_status_url');
--   select vault.create_secret('<random secret>', 'notify_webhook_secret');
-- The same secret goes in the function's NOTIFY_WEBHOOK_SECRET.
-- Without both secrets the trigger does nothing.

create extension if not exists pg_net;

create function public.notify_status_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if new.from_status is null then
    return new; -- the tourist just created the request
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notify_status_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_webhook_secret';
  if v_url is null or v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('record', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

create trigger request_events_notify
  after insert on public.request_events
  for each row execute function public.notify_status_change();
