ALTER TABLE public.mc_kie_tarefas ADD COLUMN IF NOT EXISTS contexto_chave text;
ALTER TABLE public.mc_kie_tarefas ADD COLUMN IF NOT EXISTS proposta_tipo text;
ALTER TABLE public.mc_kie_tarefas ADD CONSTRAINT mc_kie_tarefas_proposta_tipo_check CHECK (proposta_tipo IS NULL OR proposta_tipo IN ('editavel','final')) NOT VALID;
CREATE INDEX IF NOT EXISTS mc_kie_tarefas_contexto_idx ON public.mc_kie_tarefas (project_id, contexto_chave, criado_em DESC) WHERE contexto_chave IS NOT NULL;
COMMENT ON COLUMN public.mc_kie_tarefas.contexto_chave IS 'Stable server-side recovery key for AI redesign candidates.';
COMMENT ON COLUMN public.mc_kie_tarefas.proposta_tipo IS 'AI redesign candidate kind: editable composition or final image.';