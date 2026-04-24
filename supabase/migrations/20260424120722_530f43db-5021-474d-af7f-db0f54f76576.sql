ALTER TABLE public.post_metrics_raw
ADD COLUMN IF NOT EXISTS captured_hour timestamp with time zone;

CREATE OR REPLACE FUNCTION public.set_post_metrics_captured_hour()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.captured_hour := date_trunc('hour', COALESCE(NEW.captured_at, now()));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_post_metrics_captured_hour ON public.post_metrics_raw;
CREATE TRIGGER trg_set_post_metrics_captured_hour
BEFORE INSERT OR UPDATE OF captured_at ON public.post_metrics_raw
FOR EACH ROW
EXECUTE FUNCTION public.set_post_metrics_captured_hour();

CREATE UNIQUE INDEX IF NOT EXISTS idx_post_metrics_raw_unique_hour
ON public.post_metrics_raw (post_id, network, captured_hour)
WHERE captured_hour IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('collect-post-metrics')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'collect-post-metrics');

    PERFORM cron.unschedule('generate-account-insights')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-account-insights');
  END IF;
END $$;