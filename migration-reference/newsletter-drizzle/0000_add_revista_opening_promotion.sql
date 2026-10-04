ALTER TABLE public.revista_edicao
  ADD COLUMN IF NOT EXISTS promocao_activa boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS promocao_prefixo text NOT NULL DEFAULT 'Novo curso',
  ADD COLUMN IF NOT EXISTS promocao_link_texto text NOT NULL DEFAULT 'Curso de inteligência artificial',
  ADD COLUMN IF NOT EXISTS promocao_url text NOT NULL DEFAULT 'https://fredericocarvalho.pt/curso-de-inteligencia-artificial/';