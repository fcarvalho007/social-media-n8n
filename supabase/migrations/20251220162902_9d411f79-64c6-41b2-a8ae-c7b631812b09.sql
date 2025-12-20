-- Create bucket for post cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-covers', 'post-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own covers
CREATE POLICY "Users can upload their own covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Covers are publicly readable
CREATE POLICY "Covers are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-covers');

-- Policy: Users can update their own covers
CREATE POLICY "Users can update their own covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'post-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own covers
CREATE POLICY "Users can delete their own covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add cover_image_url column to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS cover_image_url text;