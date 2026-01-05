-- Drop existing restrictive policies for UPDATE and DELETE
DROP POLICY IF EXISTS "Users can update their own drafts" ON posts_drafts;
DROP POLICY IF EXISTS "Users can delete their own drafts" ON posts_drafts;

-- Create new team-wide policies (any authenticated user can edit/delete any draft)
CREATE POLICY "Team can update all drafts"
ON posts_drafts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Team can delete all drafts"
ON posts_drafts
FOR DELETE
TO authenticated
USING (true);