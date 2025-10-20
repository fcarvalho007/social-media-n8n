DROP POLICY IF EXISTS "Service role can insert posts" ON public.posts;

CREATE POLICY "Allow anon insert for n8n" 
ON public.posts 
FOR INSERT 
TO anon
WITH CHECK (source = 'n8n_workflow');