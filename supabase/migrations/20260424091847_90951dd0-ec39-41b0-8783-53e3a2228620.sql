ALTER TABLE public.posts_drafts
ADD COLUMN IF NOT EXISTS raw_transcription TEXT,
ADD COLUMN IF NOT EXISTS ai_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS raw_transcription TEXT,
ADD COLUMN IF NOT EXISTS ai_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.ai_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  preferred_language TEXT NOT NULL DEFAULT 'pt-PT',
  default_tone TEXT NOT NULL DEFAULT 'neutro',
  brand_hashtags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  insights_enabled BOOLEAN NOT NULL DEFAULT true,
  muted_insight_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  dismissed_insights JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI preferences"
ON public.ai_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI preferences"
ON public.ai_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI preferences"
ON public.ai_preferences
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI preferences"
ON public.ai_preferences
FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_ai_preferences_updated_at
BEFORE UPDATE ON public.ai_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ai_credit_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  credits NUMERIC NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_credit_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI credit usage"
ON public.ai_credit_usage
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage AI credit usage"
ON public.ai_credit_usage
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.hashtag_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hashtag TEXT NOT NULL UNIQUE,
  status TEXT,
  volume_estimate INTEGER,
  source TEXT NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hashtag_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view verified hashtag intelligence"
ON public.hashtag_intelligence
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can manage hashtag intelligence"
ON public.hashtag_intelligence
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_hashtag_intelligence_updated_at
BEFORE UPDATE ON public.hashtag_intelligence
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.post_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID,
  user_id UUID NOT NULL,
  network TEXT NOT NULL,
  reach INTEGER,
  impressions INTEGER,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  completion_rate NUMERIC,
  engagement_rate NUMERIC NOT NULL DEFAULT 0,
  classification TEXT NOT NULL DEFAULT 'normal',
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  features_extracted JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.post_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own post performance"
ON public.post_performance
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage post performance"
ON public.post_performance
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_post_performance_user_network ON public.post_performance(user_id, network, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_performance_post_id ON public.post_performance(post_id);

CREATE TABLE IF NOT EXISTS public.account_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  network TEXT,
  format TEXT,
  insight_type TEXT NOT NULL,
  finding TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  sample_size INTEGER NOT NULL,
  p_value NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.account_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own account insights"
ON public.account_insights
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage account insights"
ON public.account_insights
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_account_insights_user_network ON public.account_insights(user_id, network, insight_type);

CREATE OR REPLACE FUNCTION public.calculate_ai_credit_usage(_user_id uuid, _action text, _credits numeric, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_credit_usage (user_id, action, credits, metadata)
  VALUES (_user_id, _action, _credits, COALESCE(_metadata, '{}'::jsonb));
END;
$$;