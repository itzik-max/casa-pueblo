-- הסיכום השבועי: הגדרות ותזמון.
-- pg_cron קורא לפונקציה weekly בכל יום שישי בין 12:00 ל־15:00 UTC, כל שעה עגולה.
-- הפונקציה עצמה בודקת את השעה בישראל: ב־15:00 נשלח מייל לאישור, וב־17:00 יוצאים הסיכומים שאושרו (בשעון קיץ ובשעון חורף).
-- לפני ההרצה שומרים ב־Vault שני סודות:
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/weekly', 'weekly_url');
--   select vault.create_secret('<סוד ארוך ואקראי>', 'cron_secret');   -- אותו ערך כמו CRON_SECRET בסודות של הפונקציה

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists app_settings_staff on public.app_settings;
create policy app_settings_staff on public.app_settings for all using (public.is_staff()) with check (public.is_staff());

-- מי מקבל את המייל לאישור ב־15:00.
insert into public.app_settings (key, value) values ('approver_emails', '["casapueblo.ji@gmail.com"]')
on conflict (key) do nothing;

create or replace function public.run_weekly() returns void
language plpgsql security definer set search_path = public as $$
declare url text; secret text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'weekly_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';
  if url is null or secret is null then raise notice 'weekly: missing vault secrets'; return; end if;
  perform net.http_post(url := url, headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret), body := '{"mode":"auto"}'::jsonb, timeout_milliseconds := 60000);
end $$;
revoke execute on function public.run_weekly() from public, anon, authenticated;

select cron.unschedule('casa-weekly') where exists (select 1 from cron.job where jobname = 'casa-weekly');
select cron.schedule('casa-weekly', '0 12-15 * * 5', 'select public.run_weekly()');
