ALTER TABLE public.posts_drafts
ADD COLUMN IF NOT EXISTS format TEXT,
ADD COLUMN IF NOT EXISTS formats TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS media_items JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS network_captions JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS use_separate_captions BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_posts_drafts_format ON public.posts_drafts(format);