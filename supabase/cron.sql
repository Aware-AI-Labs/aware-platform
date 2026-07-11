-- AWARE's heartbeat schedule — pg_cron + pg_net calling the deployed platform.
-- Run once in the Supabase SQL editor AFTER deploying:
--   1. Replace PLATFORM_URL with the production URL (no trailing slash).
--   2. Replace CRON_SECRET_VALUE with the CRON_SECRET env value.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'aware-tick',
  '5 * * * *', -- hourly at :05
  $$ select net.http_get('PLATFORM_URL/api/cron/tick?secret=CRON_SECRET_VALUE') $$
);

select cron.schedule(
  'aware-daily',
  '30 12 * * *', -- 12:30 UTC ≈ 6:30am Chicago
  $$ select net.http_get('PLATFORM_URL/api/cron/daily?secret=CRON_SECRET_VALUE') $$
);

select cron.schedule(
  'aware-weekly',
  '0 13 * * 1', -- Mondays 13:00 UTC
  $$ select net.http_get('PLATFORM_URL/api/cron/weekly?secret=CRON_SECRET_VALUE') $$
);

-- To inspect: select * from cron.job;
-- To remove:  select cron.unschedule('aware-tick');
