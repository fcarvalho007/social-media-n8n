ALTER TABLE public.nl_revista_edicao
  ADD COLUMN IF NOT EXISTS recomendacao_subtitulo text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.nl_revista_edicao.recomendacao_subtitulo IS
  'Subtítulo opcional, em HTML restrito, do bloco Esta semana recomendo.';