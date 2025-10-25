-- Allow anonymous clients to update stories status (app uses mock auth)
DROP POLICY IF EXISTS "anon_update_stories" ON public.stories;

CREATE POLICY "anon_update_stories"
ON public.stories
FOR UPDATE
TO anon
USING (true)
WITH CHECK (status IN ('pending','approved','rejected'));