-- Enable DELETE for authenticated users on posts table
CREATE POLICY "authenticated_delete_posts" 
ON public.posts 
FOR DELETE 
TO authenticated 
USING (true);

-- Enable DELETE for authenticated users on stories table
CREATE POLICY "authenticated_delete_stories" 
ON public.stories 
FOR DELETE 
TO authenticated 
USING (true);