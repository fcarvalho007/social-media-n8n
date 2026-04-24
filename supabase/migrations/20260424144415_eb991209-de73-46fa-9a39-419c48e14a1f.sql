ALTER TABLE public.user_ai_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_credits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own AI credits" ON public.user_ai_credits;
DROP POLICY IF EXISTS "Service role manages AI credits" ON public.user_ai_credits;
DROP POLICY IF EXISTS "Users can insert their own AI credits" ON public.user_ai_credits;
DROP POLICY IF EXISTS "Users can update their own AI credits" ON public.user_ai_credits;
DROP POLICY IF EXISTS "Users can delete their own AI credits" ON public.user_ai_credits;

CREATE POLICY "Users can view their own AI credits"
ON public.user_ai_credits
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role manages AI credits"
ON public.user_ai_credits
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own AI usage log" ON public.ai_usage_log;
DROP POLICY IF EXISTS "Service role manages AI usage log" ON public.ai_usage_log;
DROP POLICY IF EXISTS "Users can insert their own AI usage log" ON public.ai_usage_log;
DROP POLICY IF EXISTS "Users can update their own AI usage log" ON public.ai_usage_log;
DROP POLICY IF EXISTS "Users can delete their own AI usage log" ON public.ai_usage_log;

CREATE POLICY "Users can view their own AI usage log"
ON public.ai_usage_log
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role manages AI usage log"
ON public.ai_usage_log
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.user_hashtag_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  hashtag text NOT NULL,
  times_used integer NOT NULL DEFAULT 1,
  last_used_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_hashtag_history_unique_user_hashtag UNIQUE (user_id, hashtag),
  CONSTRAINT user_hashtag_history_hashtag_not_blank CHECK (length(trim(hashtag)) > 0),
  CONSTRAINT user_hashtag_history_times_used_positive CHECK (times_used > 0)
);

ALTER TABLE public.user_hashtag_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hashtag_history FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own hashtag history" ON public.user_hashtag_history;
DROP POLICY IF EXISTS "Users can create their own hashtag history" ON public.user_hashtag_history;
DROP POLICY IF EXISTS "Users can update their own hashtag history" ON public.user_hashtag_history;
DROP POLICY IF EXISTS "Users can delete their own hashtag history" ON public.user_hashtag_history;

CREATE POLICY "Users can view their own hashtag history"
ON public.user_hashtag_history
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own hashtag history"
ON public.user_hashtag_history
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own hashtag history"
ON public.user_hashtag_history
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own hashtag history"
ON public.user_hashtag_history
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_hashtag_history_user_last_used
ON public.user_hashtag_history(user_id, last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_hashtag_history_user_times_used
ON public.user_hashtag_history(user_id, times_used DESC, last_used_at DESC);

DROP TRIGGER IF EXISTS update_user_hashtag_history_updated_at ON public.user_hashtag_history;
CREATE TRIGGER update_user_hashtag_history_updated_at
BEFORE UPDATE ON public.user_hashtag_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();