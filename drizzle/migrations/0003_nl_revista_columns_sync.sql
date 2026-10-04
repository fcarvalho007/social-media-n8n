ALTER TABLE public.nl_revista_edicao
  ADD COLUMN IF NOT EXISTS promocao_activa boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS promocao_prefixo text NOT NULL DEFAULT 'Novo curso',
  ADD COLUMN IF NOT EXISTS promocao_link_texto text NOT NULL DEFAULT 'Curso de inteligência artificial',
  ADD COLUMN IF NOT EXISTS promocao_url text NOT NULL DEFAULT 'https://fredericocarvalho.pt/curso-de-inteligencia-artificial/',
  ADD COLUMN IF NOT EXISTS cronica_imagem_recorte_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cronica_imagem_enquadramento jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS servicos_cursos_activo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS servicos_consultoria_activo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS servicos_auditoria_activo boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.nl_revista_edicao.servicos_activo IS 'DEPRECATED: compatibilidade histórica; a presença da secção deriva dos estados individuais.';
ALTER TABLE public.nl_ia_uso DROP CONSTRAINT IF EXISTS nl_ia_uso_origem_check;
ALTER TABLE public.nl_ia_uso ADD CONSTRAINT nl_ia_uso_origem_check CHECK (origem = ANY (ARRAY['colagem_manual','curadoria_rss','sugerir_assunto','encurtar_descricao','pesquisar_fonte','embedding_deteccao_repeticao','confirmar_repeticao','curadoria_fila','extraccao_noticia','descricao_reescrita','minha_leitura','email','email_newsletter','manual_ia','sugestao_organizacao','preparar_consulta_fonte','curadoria_ferramentas_relevancia','curadoria_ferramentas_polimento','brief','apresentacao_cronica','pecas_cronica']::text[]));