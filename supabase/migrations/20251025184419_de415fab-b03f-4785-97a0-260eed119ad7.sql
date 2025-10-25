-- Add publishing targets and metadata to posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS publish_targets jsonb DEFAULT '{"instagram": false, "linkedin": false}'::jsonb,
ADD COLUMN IF NOT EXISTS publish_metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS external_post_ids jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.posts.publish_targets IS 'Selected publishing targets (instagram, linkedin)';
COMMENT ON COLUMN public.posts.publish_metadata IS 'Publishing metadata per platform';
COMMENT ON COLUMN public.posts.external_post_ids IS 'External post IDs from Getlate API per platform';
