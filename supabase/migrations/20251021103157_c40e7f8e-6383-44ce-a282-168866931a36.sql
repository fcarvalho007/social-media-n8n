-- TEMPORARY DEBUG POLICY: Allow all inserts to unblock n8n
-- WARNING: This is for testing only and should be refined after confirmation

DROP POLICY IF EXISTS "n8n_insert" ON public.posts;
DROP POLICY IF EXISTS "debug_allow_all" ON public.posts;

CREATE POLICY "debug_allow_all" 
ON public.posts
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;