ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS network_options JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.posts_drafts
ADD COLUMN IF NOT EXISTS network_options JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.posts.network_options IS 'Advanced per-network publishing options captured from manual create flow';
COMMENT ON COLUMN public.posts_drafts.network_options IS 'Advanced per-network publishing options saved with manual create drafts';