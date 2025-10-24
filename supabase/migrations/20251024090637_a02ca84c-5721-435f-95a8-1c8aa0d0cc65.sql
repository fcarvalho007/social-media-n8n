-- Create social_profiles table to manage connected accounts
CREATE TABLE IF NOT EXISTS public.social_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  network TEXT NOT NULL CHECK (network IN ('instagram', 'linkedin', 'facebook', 'x', 'tiktok', 'youtube')),
  profile_name TEXT NOT NULL,
  profile_handle TEXT,
  profile_image_url TEXT,
  connection_status TEXT NOT NULL DEFAULT 'connected' CHECK (connection_status IN ('connected', 'expired', 'missing_permission')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  profile_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, network, profile_handle)
);

-- Enable RLS
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_profiles
CREATE POLICY "Users can view their own profiles"
  ON public.social_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profiles"
  ON public.social_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles"
  ON public.social_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profiles"
  ON public.social_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Create media_library table
CREATE TABLE IF NOT EXISTS public.media_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size BIGINT,
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- for videos in seconds
  aspect_ratio TEXT,
  is_favorite BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies for media_library
CREATE POLICY "Users can view their own media"
  ON public.media_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media"
  ON public.media_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media"
  ON public.media_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media"
  ON public.media_library FOR DELETE
  USING (auth.uid() = user_id);

-- Update posts table for manual scheduling
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'carousel' CHECK (post_type IN ('image', 'video', 'carousel', 'text')),
  ADD COLUMN IF NOT EXISTS selected_networks TEXT[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS media_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS first_comment TEXT,
  ADD COLUMN IF NOT EXISTS alt_texts JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS utm_preset TEXT,
  ADD COLUMN IF NOT EXISTS schedule_asap BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS network_validations JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS approval_comments TEXT,
  ADD COLUMN IF NOT EXISTS origin_mode TEXT DEFAULT 'ia' CHECK (origin_mode IN ('manual', 'ia'));

-- Update status constraint to include new states
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_status_check 
  CHECK (status IN ('draft', 'waiting_for_approval', 'pending', 'approved', 'scheduled', 'published', 'rejected', 'failed'));

-- Create trigger for updated_at on social_profiles
CREATE OR REPLACE FUNCTION public.update_social_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_social_profiles_updated_at
  BEFORE UPDATE ON public.social_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_social_profiles_updated_at();

-- Create trigger for updated_at on media_library
CREATE OR REPLACE FUNCTION public.update_media_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_media_library_updated_at
  BEFORE UPDATE ON public.media_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_media_library_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_social_profiles_user_id ON public.social_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_social_profiles_network ON public.social_profiles(network);
CREATE INDEX IF NOT EXISTS idx_media_library_user_id ON public.media_library(user_id);
CREATE INDEX IF NOT EXISTS idx_media_library_file_type ON public.media_library(file_type);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_date ON public.posts(scheduled_date);

-- Update RLS on posts to check user_id
DROP POLICY IF EXISTS authenticated_read ON public.posts;
DROP POLICY IF EXISTS authenticated_update ON public.posts;
DROP POLICY IF EXISTS public_read_posts ON public.posts;

CREATE POLICY "Users can view their own posts"
  ON public.posts FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);