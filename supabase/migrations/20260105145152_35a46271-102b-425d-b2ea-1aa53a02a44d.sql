-- Add publication_url and post_id columns to media_library
ALTER TABLE media_library 
ADD COLUMN IF NOT EXISTS publication_url TEXT,
ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES posts(id) ON DELETE SET NULL;

-- Create index for post_id lookups
CREATE INDEX IF NOT EXISTS idx_media_library_post_id ON media_library(post_id);