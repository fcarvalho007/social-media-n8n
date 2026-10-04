ALTER TABLE public.revista_edicao
  ADD COLUMN IF NOT EXISTS cronica_imagem_recorte_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cronica_imagem_enquadramento jsonb NOT NULL DEFAULT '{}'::jsonb;