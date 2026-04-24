ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS ai_generated_fields JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_features_extracted JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS performance_classification TEXT,
ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC,
ADD COLUMN IF NOT EXISTS metrics_captured_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.ai_preferences
ADD COLUMN IF NOT EXISTS preferred_model TEXT NOT NULL DEFAULT 'fast',
ADD COLUMN IF NOT EXISTS auto_alt_text BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_first_comment BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.user_ai_credits (
  user_id UUID PRIMARY KEY,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  credits_monthly_allowance INTEGER NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMP WITH TIME ZONE,
  plan_tier TEXT NOT NULL DEFAULT 'free',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_ai_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own AI credits" ON public.user_ai_credits;
CREATE POLICY "Users can view their own AI credits"
ON public.user_ai_credits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages AI credits" ON public.user_ai_credits;
CREATE POLICY "Service role manages AI credits"
ON public.user_ai_credits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP TRIGGER IF EXISTS update_user_ai_credits_updated_at ON public.user_ai_credits;
CREATE TRIGGER update_user_ai_credits_updated_at
BEFORE UPDATE ON public.user_ai_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  feature TEXT,
  credits_consumed INTEGER NOT NULL,
  tokens_used INTEGER,
  provider TEXT,
  model TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own AI usage log" ON public.ai_usage_log;
CREATE POLICY "Users can view their own AI usage log"
ON public.ai_usage_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages AI usage log" ON public.ai_usage_log;
CREATE POLICY "Service role manages AI usage log"
ON public.ai_usage_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_created_at ON public.ai_usage_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_action_type ON public.ai_usage_log(action_type, created_at DESC);

ALTER TABLE public.account_insights
ADD COLUMN IF NOT EXISTS delta_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS dismissed_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS dismissed_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS never_show BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.user_brand_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  hashtag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, hashtag)
);

ALTER TABLE public.user_brand_hashtags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own brand hashtags" ON public.user_brand_hashtags;
CREATE POLICY "Users can view their own brand hashtags"
ON public.user_brand_hashtags
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own brand hashtags" ON public.user_brand_hashtags;
CREATE POLICY "Users can create their own brand hashtags"
ON public.user_brand_hashtags
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own brand hashtags" ON public.user_brand_hashtags;
CREATE POLICY "Users can delete their own brand hashtags"
ON public.user_brand_hashtags
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_brand_hashtags_user ON public.user_brand_hashtags(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.hashtag_metadata (
  hashtag TEXT PRIMARY KEY,
  volume_estimate BIGINT,
  status TEXT,
  source TEXT,
  last_verified TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

ALTER TABLE public.hashtag_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view hashtag metadata" ON public.hashtag_metadata;
CREATE POLICY "Authenticated users can view hashtag metadata"
ON public.hashtag_metadata
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Service role manages hashtag metadata" ON public.hashtag_metadata;
CREATE POLICY "Service role manages hashtag metadata"
ON public.hashtag_metadata
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.consume_ai_credits(_user_id uuid, _credits integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining integer;
BEGIN
  IF _credits <= 0 THEN
    RETURN true;
  END IF;

  SELECT credits_remaining INTO v_remaining
  FROM public.user_ai_credits
  WHERE user_id = _user_id
  FOR UPDATE;

  IF v_remaining IS NULL THEN
    INSERT INTO public.user_ai_credits (user_id, credits_remaining, credits_monthly_allowance, last_reset_at, plan_tier)
    VALUES (_user_id, 0, 0, now(), 'free')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN false;
  END IF;

  IF v_remaining < _credits THEN
    RETURN false;
  END IF;

  UPDATE public.user_ai_credits
  SET credits_remaining = credits_remaining - _credits,
      updated_at = now()
  WHERE user_id = _user_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_ai_usage(
  _user_id uuid,
  _action_type text,
  _feature text,
  _credits_consumed integer,
  _tokens_used integer,
  _provider text,
  _model text,
  _success boolean,
  _error_message text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_usage_log (
    user_id,
    action_type,
    feature,
    credits_consumed,
    tokens_used,
    provider,
    model,
    success,
    error_message,
    metadata
  ) VALUES (
    _user_id,
    _action_type,
    _feature,
    _credits_consumed,
    _tokens_used,
    _provider,
    _model,
    _success,
    _error_message,
    COALESCE(_metadata, '{}'::jsonb)
  );
END;
$$;