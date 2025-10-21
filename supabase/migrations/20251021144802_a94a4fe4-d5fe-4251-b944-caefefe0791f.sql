-- Drop existing restrictive insert policy if exists
DROP POLICY IF EXISTS "service_insert_stories" ON public.stories;

-- Create new policy to allow public/anon inserts
CREATE POLICY "Allow public inserts"
ON public.stories
FOR INSERT
TO anon
WITH CHECK (true);