CREATE TABLE public.mc_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  media_id uuid,
  origem text NOT NULL DEFAULT 'biblioteca' CHECK (origem IN ('biblioteca')),
  nome text CHECK (char_length(nome) <= 200),
  bucket text NOT NULL CHECK (bucket = 'motor-assets'),
  storage_path text NOT NULL CHECK (char_length(storage_path) <= 300),
  hash text NOT NULL CHECK (hash ~ '^[0-9a-f]{64}$'),
  mime text NOT NULL CHECK (mime IN ('image/png','image/jpeg')),
  largura integer NOT NULL CHECK (largura BETWEEN 1 AND 8000),
  altura integer NOT NULL CHECK (altura BETWEEN 1 AND 8000),
  bytes integer NOT NULL CHECK (bytes BETWEEN 1 AND 6291456),
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, hash)
);
GRANT SELECT ON public.mc_assets TO authenticated;
GRANT ALL ON public.mc_assets TO service_role;
ALTER TABLE public.mc_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mc_assets leitura do projeto" ON public.mc_assets FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));

CREATE OR REPLACE FUNCTION public.mc_assets_imutavel() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'recursos do motor são imutáveis' USING ERRCODE = '42501';
END $$;
CREATE TRIGGER mc_assets_sem_alteracao BEFORE UPDATE ON public.mc_assets FOR EACH ROW EXECUTE FUNCTION public.mc_assets_imutavel();

CREATE OR REPLACE FUNCTION public.mc_criar_trabalho_fonte(_project_id uuid, _tipo text, _texto text, _titulo text, _origem_url text, _metadados jsonb, _brief jsonb, _prompt_versao text, _modelo text, _parametros jsonb, _nova boolean DEFAULT false)
 RETURNS TABLE(trabalho_id uuid, fonte_id uuid, cache_chave text, reutilizado boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _fh text; _fid uuid; _ck text; _tid uuid; _texto_n text; _meta jsonb;
BEGIN
  IF NOT public.mc_pode_escrever(_project_id) THEN
    RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE = '42501';
  END IF;
  IF _tipo NOT IN ('texto','link','pdf') THEN
    RAISE EXCEPTION 'tipo de fonte inválido' USING ERRCODE = '22023';
  END IF;
  _meta := coalesce(_metadados, '{}'::jsonb);
  _texto_n := btrim(regexp_replace(replace(coalesce(_texto,''), E'\r\n', E'\n'), '[ \t]+', ' ', 'g'));
  _fh := public.mc_hash(jsonb_build_object('tipo',_tipo,'texto',_texto_n,'url',_origem_url,'meta',_meta));
  INSERT INTO public.mc_fontes (project_id, tipo, titulo, origem_url, texto, metadados, hash, criado_por)
  VALUES (_project_id, _tipo, _titulo, _origem_url, _texto_n, _meta, _fh, auth.uid())
  ON CONFLICT (project_id, hash) DO NOTHING;
  SELECT f.id INTO _fid FROM public.mc_fontes f WHERE f.project_id = _project_id AND f.hash = _fh;
  _ck := public.mc_hash(jsonb_build_object('projeto',_project_id,'fonte',_fh,'prompt',_prompt_versao,
           'modelo',_modelo,'parametros',coalesce(_parametros,'{}'),'brief',coalesce(_brief,'{}'),
           'nova', CASE WHEN _nova THEN gen_random_uuid()::text END));
  INSERT INTO public.mc_trabalhos (project_id, fonte_id, brief, prompt_versao, modelo, parametros, cache_chave, explicito, criado_por)
  VALUES (_project_id, _fid, coalesce(_brief,'{}'), _prompt_versao, _modelo, coalesce(_parametros,'{}'), _ck, _nova, auth.uid())
  ON CONFLICT ON CONSTRAINT mc_trabalhos_cache_chave_key DO NOTHING
  RETURNING id INTO _tid;
  IF _tid IS NOT NULL THEN
    INSERT INTO public.mc_propostas (project_id, trabalho_id) VALUES (_project_id, _tid);
    INSERT INTO public.mc_etapas (trabalho_id, etapa, estado) VALUES (_tid, 'fonte', 'criado');
    RETURN QUERY SELECT _tid, _fid, _ck, false;
  ELSE
    RETURN QUERY SELECT t.id, _fid, _ck, true FROM public.mc_trabalhos t WHERE t.cache_chave = _ck;
  END IF;
END $function$;
REVOKE ALL ON FUNCTION public.mc_criar_trabalho_fonte(uuid,text,text,text,text,jsonb,jsonb,text,text,jsonb,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mc_criar_trabalho_fonte(uuid,text,text,text,text,jsonb,jsonb,text,text,jsonb,boolean) TO authenticated, service_role;