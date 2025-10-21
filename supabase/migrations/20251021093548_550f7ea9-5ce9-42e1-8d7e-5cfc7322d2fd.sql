-- Drop existing n8n insert policy
DROP POLICY IF EXISTS "n8n can insert posts" ON posts;

-- Create new policy that allows inserts from n8n workflow (including anon role)
CREATE POLICY "n8n can insert posts" 
ON posts 
FOR INSERT 
TO anon, authenticated
WITH CHECK (source = 'n8n_workflow');

-- Ensure RLS is enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;