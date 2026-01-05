-- Update RLS policy for posts_drafts to allow all authenticated users to SELECT
-- This ensures drafts appear in calendar regardless of owner

-- Drop existing select policy
DROP POLICY IF EXISTS "Users can view their own drafts" ON public.posts_drafts;

-- Create new policy that allows all authenticated users to view all drafts
CREATE POLICY "Authenticated users can view all drafts"
ON public.posts_drafts
FOR SELECT
TO authenticated
USING (true);

-- Keep existing policies for INSERT, UPDATE, DELETE restricted to owner
-- (These should already exist, but let's ensure they're correct)
DROP POLICY IF EXISTS "Users can create their own drafts" ON public.posts_drafts;
DROP POLICY IF EXISTS "Users can update their own drafts" ON public.posts_drafts;
DROP POLICY IF EXISTS "Users can delete their own drafts" ON public.posts_drafts;

CREATE POLICY "Users can create their own drafts"
ON public.posts_drafts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
ON public.posts_drafts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
ON public.posts_drafts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);