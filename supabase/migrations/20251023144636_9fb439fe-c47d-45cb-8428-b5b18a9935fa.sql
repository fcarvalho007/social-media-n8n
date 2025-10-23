-- Allow public (anon) read access to posts and stories so the dashboard can list items without login
-- Keeps RLS enabled and scoped only to SELECT

-- Enable RLS explicitly (no-op if already enabled)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Posts: public read policy for anon role
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'public_read_posts'
  ) THEN
    CREATE POLICY "public_read_posts"
    ON public.posts
    FOR SELECT
    TO anon
    USING (true);
  END IF;

  -- Stories: public read policy for anon role
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'stories' AND policyname = 'public_read_stories'
  ) THEN
    CREATE POLICY "public_read_stories"
    ON public.stories
    FOR SELECT
    TO anon
    USING (true);
  END IF;
END $$;