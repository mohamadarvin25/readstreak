-- Runs the send-reminders Edge Function every 15 minutes.
-- Before running: replace YOUR-PROJECT-REF and YOUR-CRON-SECRET (same value as the CRON_SECRET secret).
-- Run in Supabase: SQL Editor -> New query -> paste -> Run.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-running replaces the existing job.
select cron.unschedule('readstreak-reminders')
where exists (select 1 from cron.job where jobname = 'readstreak-reminders');

select cron.schedule(
  'readstreak-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR-CRON-SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
