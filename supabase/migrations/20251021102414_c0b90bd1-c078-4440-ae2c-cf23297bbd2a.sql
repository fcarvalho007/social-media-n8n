-- Make INSERT policy robust for n8n and accept both anon and authenticated (some setups send anon JWT as authenticated)
DROP POLICY IF EXISTS "n8n_insert" ON public.posts;

CREATE POLICY "n8n_insert"
ON public.posts
FOR INSERT
TO anon, authenticated
WITH CHECK (
  lower(btrim(source)) = 'n8n_workflow'
);

-- Ensure RLS remains enabled
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;