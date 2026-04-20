-- Trigger to enforce invariant: published posts must not have error_log
CREATE OR REPLACE FUNCTION public.clear_error_log_on_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NOT NULL THEN
    NEW.error_log := NULL;
    NEW.failed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_error_log_null_on_publish ON public.posts;

CREATE TRIGGER set_error_log_null_on_publish
BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.clear_error_log_on_publish();

-- Enable extensions for cron scheduling (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;