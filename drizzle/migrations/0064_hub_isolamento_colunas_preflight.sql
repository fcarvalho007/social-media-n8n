ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);
ALTER TABLE public.instagram_analytics ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);
ALTER TABLE public.instagram_profiles ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);