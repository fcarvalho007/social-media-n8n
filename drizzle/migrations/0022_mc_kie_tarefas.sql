ALTER TABLE public.mc_assets DROP CONSTRAINT IF EXISTS mc_assets_origem_check;
ALTER TABLE public.mc_assets ADD CONSTRAINT mc_assets_origem_check CHECK (origem = ANY (ARRAY['biblioteca'::text, 'kie'::text]));

CREATE TABLE public.mc_kie_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  criado_por uuid NOT NULL,
  modelo text NOT NULL,
  prompt text NOT NULL CHECK (char_length(prompt) <= 2000),
  estado text NOT NULL DEFAULT 'reservada' CHECK (estado IN ('reservada','criada','concluida','falhou','desconhecido')),
  task_id text UNIQUE,
  asset_id uuid REFERENCES public.mc_assets(id),
  erro text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  actualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mc_kie_tarefas TO authenticated;
GRANT ALL ON public.mc_kie_tarefas TO service_role;
ALTER TABLE public.mc_kie_tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ler tarefas Kie do projeto" ON public.mc_kie_tarefas FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));
CREATE INDEX mc_kie_tarefas_proj_idx ON public.mc_kie_tarefas (project_id, criado_em DESC);