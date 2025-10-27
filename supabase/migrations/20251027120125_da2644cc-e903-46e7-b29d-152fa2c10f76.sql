-- Add LinkedIn-specific columns to posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS linkedin_body TEXT,
ADD COLUMN IF NOT EXISTS linkedin_published BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS linkedin_external_id TEXT,
ADD COLUMN IF NOT EXISTS linkedin_permalink TEXT;