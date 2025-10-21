-- 1) Drop existing overly-permissive policies
DROP POLICY IF EXISTS "Authenticated users can delete" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can read" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can update" ON public.posts;
DROP POLICY IF EXISTS "n8n can insert posts" ON public.posts;

-- 2) Secure policies
-- Allow n8n (unauthenticated webhook) to insert only when the source matches
CREATE POLICY "n8n_insert"
ON public.posts
FOR INSERT
TO anon
WITH CHECK (source = 'n8n_workflow');

-- Allow authenticated users to read all posts (reviewers)
CREATE POLICY "authenticated_read"
ON public.posts
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update posts, ensuring status remains within the allowed set
CREATE POLICY "authenticated_update"
ON public.posts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  status IN ('approved', 'rejected', 'published', 'pending')
);

-- 3) Ensure RLS is enabled
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;