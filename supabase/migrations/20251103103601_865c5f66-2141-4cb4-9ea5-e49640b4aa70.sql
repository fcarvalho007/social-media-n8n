-- Fix infinite recursion in RLS policies

-- Drop the problematic policy for projects that creates recursion
DROP POLICY IF EXISTS "Users can view projects they own or are assigned to" ON public.projects;

-- Create a simpler policy for projects that only checks ownership
CREATE POLICY "Project owners can view their projects" 
ON public.projects 
FOR SELECT 
USING (auth.uid() = owner_id);

-- Drop the problematic policy for tasks that creates recursion
DROP POLICY IF EXISTS "Users can view tasks from their projects" ON public.tasks;

-- Create a simpler policy for tasks without recursive subqueries
CREATE POLICY "Users can view their tasks" 
ON public.tasks 
FOR SELECT 
USING (
  assignee_id = auth.uid() 
  OR reporter_id = auth.uid() 
  OR EXISTS (
    SELECT 1 
    FROM public.projects p 
    WHERE p.id = tasks.project_id 
    AND p.owner_id = auth.uid()
  )
);