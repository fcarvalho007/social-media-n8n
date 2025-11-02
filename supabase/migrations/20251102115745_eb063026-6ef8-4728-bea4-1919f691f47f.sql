-- Fase 2: Tabelas para Dependências, Marcos e Templates

-- 1. Dependências de Tarefas
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('finish_to_start', 'start_to_start', 'finish_to_finish')) DEFAULT 'finish_to_start',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id),
  CONSTRAINT unique_dependency UNIQUE(task_id, depends_on_task_id)
);

-- 2. Marcos (Milestones)
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'achieved', 'missed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Associação Tarefa-Marco
CREATE TABLE IF NOT EXISTS public.task_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_task_milestone UNIQUE(task_id, milestone_id)
);

-- 4. Templates de Projetos
CREATE TABLE IF NOT EXISTS public.project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  structure JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends ON public.task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON public.milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON public.milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.milestones(status);
CREATE INDEX IF NOT EXISTS idx_task_milestones_task ON public.task_milestones(task_id);
CREATE INDEX IF NOT EXISTS idx_task_milestones_milestone ON public.task_milestones(milestone_id);
CREATE INDEX IF NOT EXISTS idx_project_templates_created_by ON public.project_templates(created_by);

-- Adicionar campos de data às tarefas (para timeline/gantt)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date DATE;

-- Trigger para atualizar updated_at em milestones
CREATE OR REPLACE FUNCTION update_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_milestones_updated_at
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_milestones_updated_at();

-- Trigger para atualizar updated_at em templates
CREATE TRIGGER trigger_update_templates_updated_at
  BEFORE UPDATE ON public.project_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

-- task_dependencies
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dependencies from their projects"
  ON public.task_dependencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_dependencies.task_id
        AND (p.owner_id = auth.uid() OR t.assignee_id = auth.uid())
    )
  );

CREATE POLICY "Users can create dependencies in their projects"
  ON public.task_dependencies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_dependencies.task_id
        AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete dependencies from their projects"
  ON public.task_dependencies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_dependencies.task_id
        AND p.owner_id = auth.uid()
    )
  );

-- milestones
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones from their projects"
  ON public.milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = milestones.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create milestones in their projects"
  ON public.milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = milestones.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update milestones in their projects"
  ON public.milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = milestones.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete milestones from their projects"
  ON public.milestones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = milestones.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- task_milestones
ALTER TABLE public.task_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task-milestone associations"
  ON public.task_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_milestones.task_id
        AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create task-milestone associations"
  ON public.task_milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_milestones.task_id
        AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete task-milestone associations"
  ON public.task_milestones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_milestones.task_id
        AND p.owner_id = auth.uid()
    )
  );

-- project_templates
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates and public templates"
  ON public.project_templates FOR SELECT
  USING (created_by = auth.uid() OR is_public = true);

CREATE POLICY "Users can create their own templates"
  ON public.project_templates FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON public.project_templates FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON public.project_templates FOR DELETE
  USING (created_by = auth.uid());