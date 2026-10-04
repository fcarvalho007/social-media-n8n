-- Content Studio: brand/project association + derived content (chronicle carousel) with durable jobs.
CREATE TABLE public.estudio_identidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('newsletter','blog','social')),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.estudio_identidades TO authenticated;
GRANT ALL ON public.estudio_identidades TO service_role;
ALTER TABLE public.estudio_identidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY ident_ler ON public.estudio_identidades FOR SELECT TO authenticated USING (true);
CREATE POLICY ident_editar ON public.estudio_identidades FOR UPDATE TO authenticated
  USING (public.nl_is_staff()) WITH CHECK (public.nl_is_staff());
INSERT INTO public.estudio_identidades (chave, nome, tipo) VALUES ('digitalsprint', 'DIGITALSPRINT', 'newsletter');

CREATE TABLE public.estudio_preferencias (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  identidade_id uuid REFERENCES public.estudio_identidades(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.estudio_preferencias TO authenticated;
GRANT ALL ON public.estudio_preferencias TO service_role;
ALTER TABLE public.estudio_preferencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY pref_ler ON public.estudio_preferencias FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY pref_criar ON public.estudio_preferencias FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY pref_editar ON public.estudio_preferencias FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Newsletter editions belong to the DIGITALSPRINT identity (origin of migrated data).
ALTER TABLE public.nl_edicoes ADD COLUMN identidade_id uuid REFERENCES public.estudio_identidades(id) ON DELETE SET NULL;
UPDATE public.nl_edicoes SET identidade_id = (SELECT id FROM public.estudio_identidades WHERE chave = 'digitalsprint') WHERE identidade_id IS NULL;
CREATE FUNCTION public.nl_edicao_identidade_padrao() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.identidade_id IS NULL THEN
    SELECT id INTO NEW.identidade_id FROM public.estudio_identidades WHERE chave = 'digitalsprint';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.nl_edicao_identidade_padrao() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER nl_edicoes_identidade BEFORE INSERT ON public.nl_edicoes FOR EACH ROW EXECUTE FUNCTION public.nl_edicao_identidade_padrao();

-- Social drafts keep the project and the editorial origin.
ALTER TABLE public.posts_drafts ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.posts_drafts ADD COLUMN origem jsonb;

-- Derived content (one per edition + type + source version).
CREATE TABLE public.nl_conteudos_derivados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id uuid NOT NULL REFERENCES public.nl_edicoes(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('carrossel_cronica')),
  identidade_id uuid REFERENCES public.estudio_identidades(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  fonte jsonb NOT NULL CHECK (jsonb_typeof(fonte) = 'object'),
  fonte_hash text NOT NULL CHECK (length(fonte_hash) = 64),
  fonte_aceite_por uuid,
  fonte_aceite_em timestamptz,
  carrossel jsonb CHECK (carrossel IS NULL OR jsonb_typeof(carrossel) = 'object'),
  versao integer NOT NULL DEFAULT 0 CHECK (versao >= 0),
  social_draft_id uuid,
  social_enviado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  actualizado_em timestamptz NOT NULL DEFAULT now(),
  actualizado_por uuid,
  UNIQUE (edicao_id, tipo, fonte_hash)
);
GRANT SELECT ON public.nl_conteudos_derivados TO authenticated;
GRANT ALL ON public.nl_conteudos_derivados TO service_role;
ALTER TABLE public.nl_conteudos_derivados ENABLE ROW LEVEL SECURITY;
CREATE POLICY cd_ler ON public.nl_conteudos_derivados FOR SELECT TO authenticated USING (public.nl_is_staff());

CREATE FUNCTION public.nl_proteger_conteudo() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.fonte IS DISTINCT FROM OLD.fonte OR NEW.fonte_hash IS DISTINCT FROM OLD.fonte_hash
     OR NEW.edicao_id IS DISTINCT FROM OLD.edicao_id OR NEW.tipo IS DISTINCT FROM OLD.tipo THEN
    RAISE EXCEPTION 'A fonte de um conteúdo derivado é imutável';
  END IF;
  IF NEW.carrossel IS DISTINCT FROM OLD.carrossel AND NEW.versao <> OLD.versao + 1 THEN
    RAISE EXCEPTION 'Versão de conteúdo inválida';
  END IF;
  NEW.actualizado_em := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.nl_proteger_conteudo() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER nl_conteudos_proteger BEFORE UPDATE ON public.nl_conteudos_derivados FOR EACH ROW EXECUTE FUNCTION public.nl_proteger_conteudo();

CREATE TABLE public.nl_conteudos_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conteudo_id uuid NOT NULL REFERENCES public.nl_conteudos_derivados(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  carrossel jsonb NOT NULL,
  origem text NOT NULL CHECK (origem IN ('ia_automatica','ia_manual','edicao')),
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conteudo_id, versao)
);
GRANT SELECT ON public.nl_conteudos_versoes TO authenticated;
GRANT ALL ON public.nl_conteudos_versoes TO service_role;
ALTER TABLE public.nl_conteudos_versoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY cv_ler ON public.nl_conteudos_versoes FOR SELECT TO authenticated USING (public.nl_is_staff());

CREATE TABLE public.nl_conteudos_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id uuid NOT NULL REFERENCES public.nl_edicoes(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('carrossel_cronica')),
  fonte_hash text NOT NULL,
  conteudo_id uuid NOT NULL REFERENCES public.nl_conteudos_derivados(id) ON DELETE CASCADE,
  origem text NOT NULL CHECK (origem IN ('envio','reconciliacao','manual')),
  estado text NOT NULL CHECK (estado IN ('aguarda_confirmacao','aguarda_revisao_fonte','pendente','aguarda_credencial','a_processar','concluido','erro','cancelado')),
  campanhas jsonb NOT NULL DEFAULT '[]'::jsonb,
  confirmado_em timestamptz,
  tentativas integer NOT NULL DEFAULT 0,
  max_tentativas integer NOT NULL DEFAULT 5,
  proxima_tentativa_em timestamptz NOT NULL DEFAULT now(),
  reservado_ate timestamptz,
  erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  actualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edicao_id, tipo, fonte_hash)
);
GRANT SELECT ON public.nl_conteudos_jobs TO authenticated;
GRANT ALL ON public.nl_conteudos_jobs TO service_role;
ALTER TABLE public.nl_conteudos_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY cj_ler ON public.nl_conteudos_jobs FOR SELECT TO authenticated USING (public.nl_is_staff());
CREATE INDEX nl_conteudos_jobs_fila ON public.nl_conteudos_jobs (estado, proxima_tentativa_em);

-- Atomic lease: claims up to _limite due jobs; service role only.
CREATE FUNCTION public.nl_reservar_jobs_conteudos(_limite integer) RETURNS SETOF public.nl_conteudos_jobs
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.nl_conteudos_jobs j SET reservado_ate = now() + interval '5 minutes', actualizado_em = now()
  WHERE j.id IN (
    SELECT id FROM public.nl_conteudos_jobs
    WHERE estado IN ('aguarda_confirmacao','pendente','aguarda_credencial')
      AND proxima_tentativa_em <= now()
      AND (reservado_ate IS NULL OR reservado_ate < now())
    ORDER BY proxima_tentativa_em
    LIMIT greatest(1, least(_limite, 5))
    FOR UPDATE SKIP LOCKED
  )
  RETURNING j.*;
$$;
REVOKE ALL ON FUNCTION public.nl_reservar_jobs_conteudos(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nl_reservar_jobs_conteudos(integer) TO service_role;

-- AI cost origin for this module.
ALTER TABLE public.nl_ia_uso DROP CONSTRAINT IF EXISTS nl_ia_uso_origem_check;
ALTER TABLE public.nl_ia_uso ADD CONSTRAINT nl_ia_uso_origem_check CHECK (origem = ANY (ARRAY['colagem_manual','curadoria_rss','sugerir_assunto','encurtar_descricao','pesquisar_fonte','embedding_deteccao_repeticao','confirmar_repeticao','curadoria_fila','extraccao_noticia','descricao_reescrita','minha_leitura','email','email_newsletter','manual_ia','sugestao_organizacao','preparar_consulta_fonte','curadoria_ferramentas_relevancia','curadoria_ferramentas_polimento','brief','apresentacao_cronica','pecas_cronica','carrossel_cronica']::text[]));

-- Carousel exports are uploaded by the author into their own folder of the existing social bucket.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'storage.objects'::regclass AND polname = 'Estudio carrossel upload own folder pdfs') THEN
    CREATE POLICY "Estudio carrossel upload own folder pdfs" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';