-- Create analytics_bookmarks table for saving favorite posts
CREATE TABLE public.analytics_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_shortcode TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_shortcode)
);

-- Enable RLS
ALTER TABLE public.analytics_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_bookmarks
CREATE POLICY "Users can view their own bookmarks"
ON public.analytics_bookmarks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
ON public.analytics_bookmarks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks"
ON public.analytics_bookmarks
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
ON public.analytics_bookmarks
FOR DELETE
USING (auth.uid() = user_id);

-- Create analytics_alerts table for engagement alerts
CREATE TABLE public.analytics_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_username TEXT NOT NULL,
  metric TEXT NOT NULL,
  operator TEXT NOT NULL DEFAULT '>',
  threshold NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_alerts
CREATE POLICY "Users can view their own alerts"
ON public.analytics_alerts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alerts"
ON public.analytics_alerts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
ON public.analytics_alerts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
ON public.analytics_alerts
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_analytics_alerts_updated_at
BEFORE UPDATE ON public.analytics_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();