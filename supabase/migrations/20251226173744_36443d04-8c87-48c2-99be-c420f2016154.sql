-- Create dedicated publications bucket for organized storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('publications', 'publications', true)
ON CONFLICT (id) DO NOTHING;

-- Add media_urls_backup column to posts table for traceability
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS media_urls_backup jsonb DEFAULT '[]'::jsonb;

-- Add recovered_from_post_id column to track recovery history
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS recovered_from_post_id uuid DEFAULT NULL;

-- Create storage policies for publications bucket
CREATE POLICY "Public read access for publications" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'publications');

CREATE POLICY "Authenticated users can upload to publications" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'publications' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own publication files" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'publications' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own publication files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'publications' AND auth.uid()::text = (storage.foldername(name))[1]);