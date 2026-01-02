-- Create table for Instagram analytics data
CREATE TABLE public.instagram_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_url TEXT NOT NULL,
  shortcode TEXT,
  post_type TEXT, -- 'Image', 'Video', 'Sidecar' (carousel)
  caption TEXT,
  hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(8,4) DEFAULT 0,
  media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  thumbnail_url TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  location_name TEXT,
  owner_username TEXT,
  dimensions_width INTEGER,
  dimensions_height INTEGER,
  is_video BOOLEAN DEFAULT false,
  video_duration DECIMAL(10,2),
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, post_url)
);

-- Enable RLS
ALTER TABLE public.instagram_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own analytics"
ON public.instagram_analytics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
ON public.instagram_analytics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics"
ON public.instagram_analytics FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analytics"
ON public.instagram_analytics FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_instagram_analytics_updated_at
BEFORE UPDATE ON public.instagram_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_instagram_analytics_user_posted ON public.instagram_analytics(user_id, posted_at DESC);
CREATE INDEX idx_instagram_analytics_engagement ON public.instagram_analytics(user_id, engagement_rate DESC);