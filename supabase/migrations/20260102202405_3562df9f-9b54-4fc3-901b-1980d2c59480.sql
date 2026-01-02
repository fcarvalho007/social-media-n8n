-- Create table for caching AI-generated analytics insights
CREATE TABLE public.analytics_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  component_name TEXT NOT NULL,
  data_hash TEXT NOT NULL,
  insights_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, component_name, data_hash)
);

-- Enable RLS
ALTER TABLE public.analytics_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own insights" 
ON public.analytics_insights 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights" 
ON public.analytics_insights 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights" 
ON public.analytics_insights 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights" 
ON public.analytics_insights 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_analytics_insights_lookup ON public.analytics_insights(user_id, component_name, data_hash);