-- Allow authenticated users to update full_name of any profile
-- This enables user management where an admin/owner can set names for team members
CREATE POLICY "Authenticated users can update full names"
ON public.profiles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);