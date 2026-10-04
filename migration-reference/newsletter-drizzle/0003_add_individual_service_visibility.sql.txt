ALTER TABLE public.revista_edicao
  ADD COLUMN IF NOT EXISTS servicos_cursos_activo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS servicos_consultoria_activo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS servicos_auditoria_activo boolean NOT NULL DEFAULT true;

UPDATE public.revista_edicao
SET
  servicos_cursos_activo = servicos_activo,
  servicos_consultoria_activo = servicos_activo,
  servicos_auditoria_activo = servicos_activo;

COMMENT ON COLUMN public.revista_edicao.servicos_activo IS 'DEPRECATED: compatibilidade histórica; a presença da secção deriva dos quatro estados individuais.';