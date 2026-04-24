SELECT cron.unschedule('generate-account-insights')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-account-insights');

SELECT cron.schedule(
  'generate-account-insights',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://vtmrimrrppuclciolzuw.supabase.co/functions/v1/generate-insights',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InZ0bXJpbXJycHB1Y2xjaW9senV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3ODg3ODQsImV4cCI6MjA3NjM2NDc4NH0.IFNfnEOL7esKqs2ajbR3rwYGLXmD_BRp54MhwgjT8FA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);