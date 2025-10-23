-- Drop existing authenticated DELETE policies
DROP POLICY IF EXISTS "authenticated_delete_posts" ON public.posts;
DROP POLICY IF EXISTS "authenticated_delete_stories" ON public.stories;

-- Create public DELETE policies (since app uses custom frontend auth)
CREATE POLICY "public_delete_posts" 
ON public.posts 
FOR DELETE 
TO anon, authenticated
USING (true);

CREATE POLICY "public_delete_stories" 
ON public.stories 
FOR DELETE 
TO anon, authenticated
USING (true);