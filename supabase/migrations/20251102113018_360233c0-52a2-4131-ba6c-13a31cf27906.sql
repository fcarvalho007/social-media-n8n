-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) <= 100),
  description TEXT,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  start_date DATE,
  due_date DATE,
  CONSTRAINT valid_dates CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date)
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 200),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date DATE,
  estimated_hours INTEGER CHECK (estimated_hours > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view projects they own or are assigned to"
ON public.projects FOR SELECT
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.project_id = projects.id
    AND tasks.assignee_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Project owners can update their projects"
ON public.projects FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Project owners can delete their projects"
ON public.projects FOR DELETE
USING (auth.uid() = owner_id);

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks from their projects"
ON public.tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = tasks.project_id
    AND (projects.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.tasks t2
      WHERE t2.project_id = projects.id
      AND t2.assignee_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can create tasks in their projects"
ON public.tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_id
    AND projects.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update tasks they created or are assigned to"
ON public.tasks FOR UPDATE
USING (
  reporter_id = auth.uid() OR
  assignee_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_id
    AND projects.owner_id = auth.uid()
  )
);

CREATE POLICY "Task reporters and project owners can delete tasks"
ON public.tasks FOR DELETE
USING (
  reporter_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_id
    AND projects.owner_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_projects_owner ON public.projects(owner_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_reporter ON public.tasks(reporter_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();