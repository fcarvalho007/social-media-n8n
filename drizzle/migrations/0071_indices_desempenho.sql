CREATE INDEX IF NOT EXISTS idx_nl_audit_log_criado_em ON public.nl_audit_log (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_hub_documentos_proj_criado ON public.hub_documentos (project_id, criado_em DESC, id);
CREATE INDEX IF NOT EXISTS idx_hub_documentos_proj_id ON public.hub_documentos (project_id, id);