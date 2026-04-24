CREATE TABLE IF NOT EXISTS public.post_metrics_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  network text NOT NULL,
  external_post_id text,
  reach integer,
  impressions integer,
  likes integer,
  comments integer,
  shares integer,
  saves integer,
  video_completion_rate numeric,
  clicks integer,
  engagement_rate_normalized numeric,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.post_metrics_raw ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'post_metrics_raw' AND policyname = 'Users can view their own post metrics'
  ) THEN
    CREATE POLICY "Users can view their own post metrics"
    ON public.post_metrics_raw
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'post_metrics_raw' AND policyname = 'Service role manages post metrics'
  ) THEN
    CREATE POLICY "Service role manages post metrics"
    ON public.post_metrics_raw
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_post_metrics_raw_post_network_captured
ON public.post_metrics_raw (post_id, network, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_metrics_raw_user_network_captured
ON public.post_metrics_raw (user_id, network, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_user_status_published
ON public.posts (user_id, status, published_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_insights_user_type_network
ON public.account_insights (user_id, insight_type, COALESCE(network, 'all'));

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('collect-post-metrics')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'collect-post-metrics');

SELECT cron.unschedule('generate-account-insights')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-account-insights');

SELECT cron.schedule(
  'collect-post-metrics',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vtmrimrrppuclciolzuw.supabase.co/functions/v1/collect-post-metrics',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0bXJpbXJycHB1Y2xjaW9senV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3ODg3ODQsImV4cCI6MjA3NjM2NDc4NH0.IFNfnEOL7esKqs2ajbR3rwYGLXmD_BRp54MhwgjT8FA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

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