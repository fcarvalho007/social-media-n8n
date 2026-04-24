UPDATE public.post_metrics_raw
SET captured_hour = date_trunc('hour', captured_at)
WHERE captured_hour IS NULL;

DELETE FROM public.post_metrics_raw a
USING public.post_metrics_raw b
WHERE a.post_id = b.post_id
  AND a.network = b.network
  AND a.captured_hour = b.captured_hour
  AND a.created_at < b.created_at;

DROP INDEX IF EXISTS public.idx_post_metrics_raw_unique_hour;

CREATE UNIQUE INDEX IF NOT EXISTS idx_post_metrics_raw_unique_hour
ON public.post_metrics_raw (post_id, network, captured_hour);

ALTER TABLE public.post_metrics_raw
ALTER COLUMN captured_hour SET NOT NULL;