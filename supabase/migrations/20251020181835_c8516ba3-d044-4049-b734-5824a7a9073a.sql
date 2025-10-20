-- 1. Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 2. Drop old policies
DROP POLICY IF EXISTS "Allow anon insert for n8n" ON posts;
DROP POLICY IF EXISTS "Authenticated users can update posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can view all posts" ON posts;

-- 3. Create correct policies
-- Allow n8n to insert
CREATE POLICY "n8n can insert posts" 
ON posts FOR INSERT 
WITH CHECK (source = 'n8n_workflow');

-- Allow authenticated users to read all
CREATE POLICY "Authenticated users can read" 
ON posts FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update" 
ON posts FOR UPDATE 
TO authenticated 
USING (true);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete" 
ON posts FOR DELETE 
TO authenticated 
USING (true);