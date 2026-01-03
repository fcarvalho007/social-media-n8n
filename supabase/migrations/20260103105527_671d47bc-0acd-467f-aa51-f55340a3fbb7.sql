-- Create table for Instagram profile data from profile scraper
CREATE TABLE public.instagram_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instagram_id TEXT NOT NULL,
  username TEXT NOT NULL,
  full_name TEXT,
  biography TEXT,
  followers_count INTEGER DEFAULT 0,
  follows_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_business_account BOOLEAN DEFAULT FALSE,
  business_category TEXT,
  profile_pic_url TEXT,
  profile_pic_url_hd TEXT,
  external_url TEXT,
  external_urls JSONB DEFAULT '[]'::jsonb,
  highlight_reel_count INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scraped_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(username, scraped_date)
);

-- Enable RLS
ALTER TABLE public.instagram_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Users can view their own profiles"
  ON public.instagram_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profiles"
  ON public.instagram_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles"
  ON public.instagram_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profiles"
  ON public.instagram_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Public read access for analytics public mode
CREATE POLICY "Allow public read access to instagram_profiles"
  ON public.instagram_profiles FOR SELECT
  USING (true);

-- Index for faster queries
CREATE INDEX idx_instagram_profiles_username ON public.instagram_profiles(username);
CREATE INDEX idx_instagram_profiles_user_id ON public.instagram_profiles(user_id);
CREATE INDEX idx_instagram_profiles_scraped_at ON public.instagram_profiles(scraped_at);

-- Update trigger for updated_at
CREATE TRIGGER update_instagram_profiles_updated_at
  BEFORE UPDATE ON public.instagram_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();