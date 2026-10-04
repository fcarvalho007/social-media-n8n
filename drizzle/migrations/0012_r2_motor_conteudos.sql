-- R2: generic content-engine persistence (additive; mc_ = motor de conteúdos)

CREATE OR REPLACE FUNCTION public.mc_pode_ler(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.owner_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.mc_pode_escrever(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.mc_pode_ler(_project_id) AND public.social_pode_escrever()
$$;

CREATE OR REPLACE FUNCTION public.mc_hash(_v jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT encode(sha256(convert_to(_v::text, 'UTF8')), 'hex')
$$;

CREATE OR REPLACE FUNCTION public.mc_bloquear_alteracao()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_user NOT IN ('authenticated','anon','service_role')
     AND current_setting('mc.permitir_limpeza', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'registo imutável (%)', TG_TABLE_NAME USING ERRCODE = 'P0001';
END $$;

CREATE TABLE public.mc_fontes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('texto','link','pdf','cronica')),
  titulo text CHECK (char_length(titulo) <= 300),
  origem_url text CHECK (char_length(origem_url) <= 2000),
  texto text NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 200000),
  metadados jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadados)='object' AND octet_length(metadados::text) <= 20000),
  hash text NOT NULL,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, hash)
);

CREATE TABLE public.mc_orcamentos (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE RESTRICT,
  max_chamadas_dia integer NOT NULL DEFAULT 0 CHECK (max_chamadas_dia BETWEEN 0 AND 1000),
  max_chamadas_trabalho integer NOT NULL DEFAULT 2 CHECK (max_chamadas_trabalho BETWEEN 0 AND 10),
  max_custo_dia_eur numeric(10,4) NOT NULL DEFAULT 0 CHECK (max_custo_dia_eur >= 0 AND max_custo_dia_eur <= 1000),
  actualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.mc_trabalhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  fonte_id uuid NOT NULL REFERENCES public.mc_fontes(id) ON DELETE RESTRICT,
  edicao_id uuid REFERENCES public.nl_edicoes(id) ON DELETE SET NULL,
  brief jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(brief)='object' AND octet_length(brief::text) <= 20000),
  prompt_versao text NOT NULL CHECK (char_length(prompt_versao) BETWEEN 1 AND 60),
  modelo text NOT NULL CHECK (char_length(modelo) BETWEEN 1 AND 120),
  parametros jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(parametros)='object' AND octet_length(parametros::text) <= 10000),
  cache_chave text NOT NULL UNIQUE,
  explicito boolean NOT NULL DEFAULT false,
  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','a_processar','concluido','erro','desconhecido','cancelado')),
  etapa text NOT NULL DEFAULT 'fonte' CHECK (etapa IN ('fonte','proposta','documento','exportacao','fim')),
  tentativas integer NOT NULL DEFAULT 0 CHECK (tentativas BETWEEN 0 AND 20),
  lease_token uuid,
  lease_ate timestamptz,
  erro text CHECK (char_length(erro) <= 2000),
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  actualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mc_trabalhos_fila_idx ON public.mc_trabalhos (estado, lease_ate) WHERE estado IN ('pendente','a_processar');
CREATE INDEX mc_trabalhos_projeto_idx ON public.mc_trabalhos (project_id, criado_em DESC);

CREATE TABLE public.mc_etapas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trabalho_id uuid NOT NULL REFERENCES public.mc_trabalhos(id) ON DELETE CASCADE,
  etapa text NOT NULL,
  estado text NOT NULL,
  detalhe jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(detalhe::text) <= 10000),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mc_etapas_trabalho_idx ON public.mc_etapas (trabalho_id, id);

CREATE TABLE public.mc_chamadas_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  trabalho_id uuid NOT NULL REFERENCES public.mc_trabalhos(id) ON DELETE RESTRICT,
  cache_chave text NOT NULL,
  tentativa integer NOT NULL CHECK (tentativa BETWEEN 1 AND 10),
  modelo text NOT NULL,
  estado text NOT NULL DEFAULT 'reservada' CHECK (estado IN ('reservada','pedido_enviado','resposta_recebida','valida','invalida','desconhecido','erro_antes_pedido')),
  resposta_bruta text CHECK (octet_length(resposta_bruta) <= 500000),
  tokens_entrada integer, tokens_saida integer,
  custo_eur numeric(10,6),
  custo_incerto boolean NOT NULL DEFAULT true,
  erro text CHECK (char_length(erro) <= 2000),
  criado_em timestamptz NOT NULL DEFAULT now(),
  actualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trabalho_id, tentativa)
);
CREATE UNIQUE INDEX mc_chamadas_cache_activa_idx ON public.mc_chamadas_ia (cache_chave)
  WHERE estado IN ('reservada','pedido_enviado','resposta_recebida','desconhecido');
CREATE INDEX mc_chamadas_projeto_dia_idx ON public.mc_chamadas_ia (project_id, criado_em);

CREATE TABLE public.mc_propostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  trabalho_id uuid NOT NULL UNIQUE REFERENCES public.mc_trabalhos(id) ON DELETE RESTRICT,
  versao_actual integer NOT NULL DEFAULT 0,
  aprovada_versao integer,
  aprovada_por uuid,
  aprovada_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  actualizado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (aprovada_versao IS NULL OR aprovada_versao <= versao_actual)
);

CREATE TABLE public.mc_propostas_versoes (
  proposta_id uuid NOT NULL REFERENCES public.mc_propostas(id) ON DELETE RESTRICT,
  versao integer NOT NULL CHECK (versao >= 1),
  conteudo jsonb NOT NULL CHECK (jsonb_typeof(conteudo)='object' AND octet_length(conteudo::text) <= 262144),
  hash text NOT NULL,
  origem text NOT NULL CHECK (origem IN ('ia','humano','importacao')),
  chamada_id uuid REFERENCES public.mc_chamadas_ia(id) ON DELETE RESTRICT,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (proposta_id, versao)
);

CREATE TABLE public.mc_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  proposta_id uuid NOT NULL REFERENCES public.mc_propostas(id) ON DELETE RESTRICT,
  variante text NOT NULL CHECK (variante IN ('A','B')),
  versao_actual integer NOT NULL DEFAULT 0,
  aprovada_versao integer,
  aprovada_por uuid,
  aprovada_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  actualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposta_id, variante),
  CHECK (aprovada_versao IS NULL OR aprovada_versao <= versao_actual)
);

CREATE TABLE public.mc_documentos_versoes (
  documento_id uuid NOT NULL REFERENCES public.mc_documentos(id) ON DELETE RESTRICT,
  versao integer NOT NULL CHECK (versao >= 1),
  proposta_versao integer NOT NULL,
  documento jsonb NOT NULL CHECK (jsonb_typeof(documento)='object' AND octet_length(documento::text) <= 2097152),
  hash text NOT NULL,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (documento_id, versao)
);

CREATE TABLE public.mc_exportacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  documento_id uuid NOT NULL,
  documento_versao integer NOT NULL,
  formato text NOT NULL CHECK (formato IN ('png','pdf','zip')),
  pagina integer CHECK (pagina BETWEEN 1 AND 20),
  storage_bucket text NOT NULL CHECK (char_length(storage_bucket) <= 100),
  storage_path text NOT NULL CHECK (char_length(storage_path) <= 500),
  hash text NOT NULL,
  bytes integer CHECK (bytes > 0),
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (documento_id, documento_versao) REFERENCES public.mc_documentos_versoes(documento_id, versao) ON DELETE RESTRICT,
  UNIQUE (documento_id, documento_versao, formato, pagina)
);

CREATE TABLE public.mc_ligacoes_sociais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  documento_id uuid NOT NULL,
  documento_versao integer NOT NULL,
  destino text NOT NULL CHECK (destino IN ('instagram','linkedin','facebook','tiktok','outro')),
  draft_id uuid REFERENCES public.posts_drafts(id) ON DELETE SET NULL,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (documento_id, documento_versao) REFERENCES public.mc_documentos_versoes(documento_id, versao) ON DELETE RESTRICT,
  UNIQUE (documento_id, documento_versao, destino)
);

GRANT SELECT ON public.mc_fontes, public.mc_orcamentos, public.mc_trabalhos, public.mc_etapas, public.mc_chamadas_ia,
  public.mc_propostas, public.mc_propostas_versoes, public.mc_documentos, public.mc_documentos_versoes,
  public.mc_exportacoes, public.mc_ligacoes_sociais TO authenticated;
GRANT ALL ON public.mc_fontes, public.mc_orcamentos, public.mc_trabalhos, public.mc_etapas, public.mc_chamadas_ia,
  public.mc_propostas, public.mc_propostas_versoes, public.mc_documentos, public.mc_documentos_versoes,
  public.mc_exportacoes, public.mc_ligacoes_sociais TO service_role;

ALTER TABLE public.mc_fontes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_trabalhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_chamadas_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_propostas_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_documentos_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_exportacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_ligacoes_sociais ENABLE ROW LEVEL SECURITY;

CREATE POLICY mc_ler ON public.mc_fontes FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));
CREATE POLICY mc_ler ON public.mc_orcamentos FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));
CREATE POLICY mc_ler ON public.mc_trabalhos FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));
CREATE POLICY mc_ler ON public.mc_etapas FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.mc_trabalhos t WHERE t.id = trabalho_id AND public.mc_pode_ler(t.project_id)));
CREATE POLICY mc_ler ON public.mc_chamadas_ia FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));
CREATE POLICY mc_ler ON public.mc_propostas FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));
CREATE POLICY mc_ler ON public.mc_propostas_versoes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.mc_propostas p WHERE p.id = proposta_id AND public.mc_pode_ler(p.project_id)));
CREATE POLICY mc_ler ON public.mc_documentos FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));
CREATE POLICY mc_ler ON public.mc_documentos_versoes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.mc_documentos d WHERE d.id = documento_id AND public.mc_pode_ler(d.project_id)));
CREATE POLICY mc_ler ON public.mc_exportacoes FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));
CREATE POLICY mc_ler ON public.mc_ligacoes_sociais FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));

CREATE TRIGGER mc_imutavel BEFORE UPDATE OR DELETE ON public.mc_fontes FOR EACH ROW EXECUTE FUNCTION public.mc_bloquear_alteracao();
CREATE TRIGGER mc_imutavel BEFORE UPDATE OR DELETE ON public.mc_etapas FOR EACH ROW EXECUTE FUNCTION public.mc_bloquear_alteracao();
CREATE TRIGGER mc_imutavel BEFORE UPDATE OR DELETE ON public.mc_propostas_versoes FOR EACH ROW EXECUTE FUNCTION public.mc_bloquear_alteracao();
CREATE TRIGGER mc_imutavel BEFORE UPDATE OR DELETE ON public.mc_documentos_versoes FOR EACH ROW EXECUTE FUNCTION public.mc_bloquear_alteracao();
CREATE TRIGGER mc_imutavel BEFORE UPDATE OR DELETE ON public.mc_exportacoes FOR EACH ROW EXECUTE FUNCTION public.mc_bloquear_alteracao();

CREATE OR REPLACE FUNCTION public.mc_validar_documento(_d jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF jsonb_typeof(_d) <> 'object' OR (_d->>'versao') IS DISTINCT FROM '1'
     OR (_d->>'largura') IS DISTINCT FROM '1080' OR (_d->>'altura') IS DISTINCT FROM '1350'
     OR jsonb_typeof(_d->'paginas') IS DISTINCT FROM 'array'
     OR jsonb_array_length(_d->'paginas') NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'documento gráfico inválido (v1, 1080x1350, 1-20 páginas)' USING ERRCODE = '22023';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.mc_criar_trabalho(
  _project_id uuid, _tipo text, _texto text, _titulo text DEFAULT NULL, _origem_url text DEFAULT NULL,
  _brief jsonb DEFAULT '{}'::jsonb, _prompt_versao text DEFAULT 'v1', _modelo text DEFAULT 'indefinido',
  _parametros jsonb DEFAULT '{}'::jsonb, _edicao_id uuid DEFAULT NULL, _nova boolean DEFAULT false)
RETURNS TABLE (trabalho_id uuid, fonte_id uuid, cache_chave text, reutilizado boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _fh text; _fid uuid; _ck text; _tid uuid; _texto_n text;
BEGIN
  IF NOT public.mc_pode_escrever(_project_id) THEN
    RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE = '42501';
  END IF;
  _texto_n := btrim(regexp_replace(replace(coalesce(_texto,''), E'\r\n', E'\n'), '[ \t]+', ' ', 'g'));
  _fh := public.mc_hash(jsonb_build_object('tipo',_tipo,'texto',_texto_n,'url',_origem_url));
  INSERT INTO public.mc_fontes (project_id, tipo, titulo, origem_url, texto, hash, criado_por)
  VALUES (_project_id, _tipo, _titulo, _origem_url, _texto_n, _fh, auth.uid())
  ON CONFLICT (project_id, hash) DO NOTHING;
  SELECT f.id INTO _fid FROM public.mc_fontes f WHERE f.project_id = _project_id AND f.hash = _fh;
  _ck := public.mc_hash(jsonb_build_object('projeto',_project_id,'fonte',_fh,'prompt',_prompt_versao,
           'modelo',_modelo,'parametros',coalesce(_parametros,'{}'),'brief',coalesce(_brief,'{}'),
           'nova', CASE WHEN _nova THEN gen_random_uuid()::text END));
  INSERT INTO public.mc_trabalhos (project_id, fonte_id, edicao_id, brief, prompt_versao, modelo, parametros, cache_chave, explicito, criado_por)
  VALUES (_project_id, _fid, _edicao_id, coalesce(_brief,'{}'), _prompt_versao, _modelo, coalesce(_parametros,'{}'), _ck, _nova, auth.uid())
  ON CONFLICT ON CONSTRAINT mc_trabalhos_cache_chave_key DO NOTHING
  RETURNING id INTO _tid;
  IF _tid IS NOT NULL THEN
    INSERT INTO public.mc_propostas (project_id, trabalho_id) VALUES (_project_id, _tid);
    INSERT INTO public.mc_etapas (trabalho_id, etapa, estado) VALUES (_tid, 'fonte', 'criado');
    RETURN QUERY SELECT _tid, _fid, _ck, false;
  ELSE
    RETURN QUERY SELECT t.id, _fid, _ck, true FROM public.mc_trabalhos t WHERE t.cache_chave = _ck;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.mc_gravar_proposta(_proposta_id uuid, _versao_esperada integer, _conteudo jsonb, _origem text DEFAULT 'humano')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.mc_propostas; _nv integer;
BEGIN
  SELECT * INTO _p FROM public.mc_propostas WHERE id = _proposta_id FOR UPDATE;
  IF NOT FOUND OR NOT public.mc_pode_escrever(_p.project_id) THEN
    RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE = '42501';
  END IF;
  IF _origem NOT IN ('humano','importacao') THEN RAISE EXCEPTION 'origem inválida' USING ERRCODE = '22023'; END IF;
  IF _p.versao_actual <> _versao_esperada THEN
    RAISE EXCEPTION 'conflito de versão (actual %, esperada %)', _p.versao_actual, _versao_esperada USING ERRCODE = '40001';
  END IF;
  _nv := _p.versao_actual + 1;
  INSERT INTO public.mc_propostas_versoes (proposta_id, versao, conteudo, hash, origem, criado_por)
  VALUES (_proposta_id, _nv, _conteudo, public.mc_hash(_conteudo), _origem, auth.uid());
  UPDATE public.mc_propostas SET versao_actual = _nv, aprovada_versao = NULL, aprovada_por = NULL, aprovada_em = NULL, actualizado_em = now()
  WHERE id = _proposta_id;
  UPDATE public.mc_documentos SET aprovada_versao = NULL, aprovada_por = NULL, aprovada_em = NULL, actualizado_em = now()
  WHERE proposta_id = _proposta_id AND aprovada_versao IS NOT NULL;
  RETURN _nv;
END $$;

CREATE OR REPLACE FUNCTION public.mc_aprovar_proposta(_proposta_id uuid, _versao integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.mc_propostas;
BEGIN
  SELECT * INTO _p FROM public.mc_propostas WHERE id = _proposta_id FOR UPDATE;
  IF NOT FOUND OR NOT public.mc_pode_escrever(_p.project_id) THEN RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE = '42501'; END IF;
  IF _p.versao_actual <> _versao OR _versao < 1 THEN RAISE EXCEPTION 'só a versão actual pode ser aprovada' USING ERRCODE = '40001'; END IF;
  UPDATE public.mc_propostas SET aprovada_versao = _versao, aprovada_por = auth.uid(), aprovada_em = now(), actualizado_em = now() WHERE id = _proposta_id;
END $$;

CREATE OR REPLACE FUNCTION public.mc_gravar_documento(_proposta_id uuid, _variante text, _versao_esperada integer, _documento jsonb)
RETURNS TABLE (documento_id uuid, versao integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.mc_propostas; _d public.mc_documentos; _nv integer;
BEGIN
  SELECT * INTO _p FROM public.mc_propostas WHERE id = _proposta_id;
  IF NOT FOUND OR NOT public.mc_pode_escrever(_p.project_id) THEN RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE = '42501'; END IF;
  IF _p.versao_actual < 1 THEN RAISE EXCEPTION 'proposta sem versão' USING ERRCODE = '22023'; END IF;
  PERFORM public.mc_validar_documento(_documento);
  INSERT INTO public.mc_documentos (project_id, proposta_id, variante) VALUES (_p.project_id, _proposta_id, _variante)
  ON CONFLICT (proposta_id, variante) DO NOTHING;
  SELECT * INTO _d FROM public.mc_documentos d WHERE d.proposta_id = _proposta_id AND d.variante = _variante FOR UPDATE;
  IF _d.versao_actual <> _versao_esperada THEN
    RAISE EXCEPTION 'conflito de versão (actual %, esperada %)', _d.versao_actual, _versao_esperada USING ERRCODE = '40001';
  END IF;
  _nv := _d.versao_actual + 1;
  INSERT INTO public.mc_documentos_versoes (documento_id, versao, proposta_versao, documento, hash, criado_por)
  VALUES (_d.id, _nv, _p.versao_actual, _documento, public.mc_hash(_documento), auth.uid());
  UPDATE public.mc_documentos SET versao_actual = _nv, aprovada_versao = NULL, aprovada_por = NULL, aprovada_em = NULL, actualizado_em = now() WHERE id = _d.id;
  RETURN QUERY SELECT _d.id, _nv;
END $$;

CREATE OR REPLACE FUNCTION public.mc_aprovar_documento(_documento_id uuid, _versao integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _d public.mc_documentos; _p public.mc_propostas; _pv integer;
BEGIN
  SELECT * INTO _d FROM public.mc_documentos WHERE id = _documento_id FOR UPDATE;
  IF NOT FOUND OR NOT public.mc_pode_escrever(_d.project_id) THEN RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE = '42501'; END IF;
  SELECT * INTO _p FROM public.mc_propostas WHERE id = _d.proposta_id;
  SELECT v.proposta_versao INTO _pv FROM public.mc_documentos_versoes v WHERE v.documento_id = _documento_id AND v.versao = _versao;
  IF _d.versao_actual <> _versao OR _pv IS DISTINCT FROM _p.versao_actual OR _p.aprovada_versao IS DISTINCT FROM _p.versao_actual THEN
    RAISE EXCEPTION 'documento desatualizado ou proposta não aprovada' USING ERRCODE = '40001';
  END IF;
  UPDATE public.mc_documentos SET aprovada_versao = _versao, aprovada_por = auth.uid(), aprovada_em = now(), actualizado_em = now() WHERE id = _documento_id;
END $$;

CREATE OR REPLACE FUNCTION public.mc_ligar_social(_documento_id uuid, _versao integer, _destino text, _draft_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _d public.mc_documentos; _id uuid;
BEGIN
  SELECT * INTO _d FROM public.mc_documentos WHERE id = _documento_id;
  IF NOT FOUND OR NOT public.mc_pode_escrever(_d.project_id) THEN RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE = '42501'; END IF;
  IF _d.aprovada_versao IS DISTINCT FROM _versao THEN RAISE EXCEPTION 'só versões aprovadas podem ser ligadas' USING ERRCODE = '40001'; END IF;
  INSERT INTO public.mc_ligacoes_sociais (project_id, documento_id, documento_versao, destino, draft_id, criado_por)
  VALUES (_d.project_id, _documento_id, _versao, _destino, _draft_id, auth.uid())
  ON CONFLICT (documento_id, documento_versao, destino) DO NOTHING RETURNING id INTO _id;
  IF _id IS NULL THEN SELECT l.id INTO _id FROM public.mc_ligacoes_sociais l WHERE l.documento_id=_documento_id AND l.documento_versao=_versao AND l.destino=_destino; END IF;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.mc_reservar_trabalhos(_limite integer DEFAULT 1, _segundos integer DEFAULT 600)
RETURNS SETOF public.mc_trabalhos LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  UPDATE public.mc_trabalhos t SET estado = 'a_processar', lease_token = gen_random_uuid(),
    lease_ate = now() + make_interval(secs => least(greatest(_segundos,30),1800)), tentativas = t.tentativas + 1, actualizado_em = now()
  WHERE t.id IN (
    SELECT x.id FROM public.mc_trabalhos x
    WHERE (x.estado = 'pendente' OR (x.estado = 'a_processar' AND x.lease_ate < now())) AND x.tentativas < 5
    ORDER BY x.criado_em FOR UPDATE SKIP LOCKED LIMIT least(greatest(_limite,1),10))
  RETURNING t.*;
END $$;

CREATE OR REPLACE FUNCTION public.mc_avancar_trabalho(_trabalho_id uuid, _lease uuid, _etapa text, _estado text, _erro text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.mc_trabalhos SET etapa = _etapa, estado = _estado, erro = _erro,
    lease_token = CASE WHEN _estado = 'a_processar' THEN lease_token END,
    lease_ate = CASE WHEN _estado = 'a_processar' THEN lease_ate END, actualizado_em = now()
  WHERE id = _trabalho_id AND lease_token = _lease AND lease_ate > now() AND estado = 'a_processar';
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.mc_etapas (trabalho_id, etapa, estado, detalhe) VALUES (_trabalho_id, _etapa, _estado, jsonb_build_object('erro', _erro));
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.mc_reservar_chamada(_trabalho_id uuid, _lease uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t public.mc_trabalhos; _o public.mc_orcamentos; _n integer; _dia integer; _custo numeric; _id uuid;
BEGIN
  SELECT * INTO _t FROM public.mc_trabalhos WHERE id = _trabalho_id AND lease_token = _lease AND lease_ate > now() AND estado = 'a_processar' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lease inválido' USING ERRCODE = '40001'; END IF;
  SELECT * INTO _o FROM public.mc_orcamentos WHERE project_id = _t.project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'orçamento não configurado' USING ERRCODE = 'P0002'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('mc_orcamento:' || _t.project_id::text));
  SELECT count(*) INTO _n FROM public.mc_chamadas_ia WHERE trabalho_id = _trabalho_id;
  SELECT count(*), coalesce(sum(custo_eur),0) INTO _dia, _custo FROM public.mc_chamadas_ia
    WHERE project_id = _t.project_id AND criado_em >= (date_trunc('day', now() AT TIME ZONE 'Europe/Lisbon') AT TIME ZONE 'Europe/Lisbon');
  IF _n >= _o.max_chamadas_trabalho OR _dia >= _o.max_chamadas_dia OR _custo >= _o.max_custo_dia_eur THEN
    RAISE EXCEPTION 'teto de chamadas atingido' USING ERRCODE = 'P0003';
  END IF;
  IF EXISTS (SELECT 1 FROM public.mc_chamadas_ia WHERE cache_chave = _t.cache_chave AND estado = 'desconhecido') THEN
    RAISE EXCEPTION 'chamada anterior em estado desconhecido; não repetir automaticamente' USING ERRCODE = 'P0004';
  END IF;
  INSERT INTO public.mc_chamadas_ia (project_id, trabalho_id, cache_chave, tentativa, modelo)
  VALUES (_t.project_id, _trabalho_id, _t.cache_chave, _n + 1, _t.modelo) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.mc_registar_chamada(_chamada_id uuid, _estado text, _resposta text DEFAULT NULL,
  _tokens_entrada integer DEFAULT NULL, _tokens_saida integer DEFAULT NULL, _custo_eur numeric DEFAULT NULL,
  _custo_incerto boolean DEFAULT true, _erro text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actual text;
BEGIN
  SELECT estado INTO _actual FROM public.mc_chamadas_ia WHERE id = _chamada_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'chamada inexistente' USING ERRCODE = 'P0002'; END IF;
  IF NOT ((_actual = 'reservada' AND _estado IN ('pedido_enviado','erro_antes_pedido'))
       OR (_actual = 'pedido_enviado' AND _estado IN ('resposta_recebida','desconhecido'))
       OR (_actual = 'resposta_recebida' AND _estado IN ('valida','invalida'))) THEN
    RAISE EXCEPTION 'transição inválida % -> %', _actual, _estado USING ERRCODE = '22023';
  END IF;
  IF _estado = 'resposta_recebida' AND _resposta IS NULL THEN RAISE EXCEPTION 'resposta obrigatória' USING ERRCODE = '22023'; END IF;
  UPDATE public.mc_chamadas_ia SET estado = _estado, resposta_bruta = coalesce(_resposta, resposta_bruta),
    tokens_entrada = coalesce(_tokens_entrada, tokens_entrada), tokens_saida = coalesce(_tokens_saida, tokens_saida),
    custo_eur = coalesce(_custo_eur, custo_eur), custo_incerto = _custo_incerto, erro = _erro, actualizado_em = now()
  WHERE id = _chamada_id;
END $$;

CREATE OR REPLACE FUNCTION public.mc_gravar_proposta_ia(_trabalho_id uuid, _lease uuid, _chamada_id uuid, _conteudo jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.mc_propostas; _nv integer;
BEGIN
  PERFORM 1 FROM public.mc_trabalhos WHERE id = _trabalho_id AND lease_token = _lease AND lease_ate > now() AND estado = 'a_processar';
  IF NOT FOUND THEN RAISE EXCEPTION 'lease inválido' USING ERRCODE = '40001'; END IF;
  PERFORM 1 FROM public.mc_chamadas_ia WHERE id = _chamada_id AND trabalho_id = _trabalho_id AND estado = 'valida';
  IF NOT FOUND THEN RAISE EXCEPTION 'chamada não validada' USING ERRCODE = '22023'; END IF;
  SELECT * INTO _p FROM public.mc_propostas WHERE trabalho_id = _trabalho_id FOR UPDATE;
  IF _p.versao_actual <> 0 THEN RAISE EXCEPTION 'proposta já tem conteúdo; IA não sobrescreve' USING ERRCODE = '40001'; END IF;
  _nv := 1;
  INSERT INTO public.mc_propostas_versoes (proposta_id, versao, conteudo, hash, origem, chamada_id)
  VALUES (_p.id, _nv, _conteudo, public.mc_hash(_conteudo), 'ia', _chamada_id);
  UPDATE public.mc_propostas SET versao_actual = _nv, actualizado_em = now() WHERE id = _p.id;
  RETURN _nv;
END $$;

CREATE OR REPLACE FUNCTION public.mc_registar_exportacao(_documento_id uuid, _versao integer, _formato text, _pagina integer,
  _bucket text, _path text, _hash text, _bytes integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pid uuid; _id uuid;
BEGIN
  SELECT d.project_id INTO _pid FROM public.mc_documentos d JOIN public.mc_documentos_versoes v ON v.documento_id = d.id AND v.versao = _versao WHERE d.id = _documento_id;
  IF _pid IS NULL THEN RAISE EXCEPTION 'versão inexistente' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.mc_exportacoes (project_id, documento_id, documento_versao, formato, pagina, storage_bucket, storage_path, hash, bytes)
  VALUES (_pid, _documento_id, _versao, _formato, _pagina, _bucket, _path, _hash, _bytes)
  ON CONFLICT (documento_id, documento_versao, formato, pagina) DO NOTHING RETURNING id INTO _id;
  IF _id IS NULL THEN RAISE EXCEPTION 'exportação já existe para esta versão (imutável)' USING ERRCODE = '23505'; END IF;
  RETURN _id;
END $$;

REVOKE ALL ON FUNCTION public.mc_pode_ler(uuid), public.mc_pode_escrever(uuid), public.mc_bloquear_alteracao(),
  public.mc_criar_trabalho(uuid,text,text,text,text,jsonb,text,text,jsonb,uuid,boolean),
  public.mc_gravar_proposta(uuid,integer,jsonb,text), public.mc_aprovar_proposta(uuid,integer),
  public.mc_gravar_documento(uuid,text,integer,jsonb), public.mc_aprovar_documento(uuid,integer),
  public.mc_ligar_social(uuid,integer,text,uuid),
  public.mc_reservar_trabalhos(integer,integer), public.mc_avancar_trabalho(uuid,uuid,text,text,text),
  public.mc_reservar_chamada(uuid,uuid), public.mc_registar_chamada(uuid,text,text,integer,integer,numeric,boolean,text),
  public.mc_gravar_proposta_ia(uuid,uuid,uuid,jsonb),
  public.mc_registar_exportacao(uuid,integer,text,integer,text,text,text,integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mc_pode_ler(uuid), public.mc_pode_escrever(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mc_criar_trabalho(uuid,text,text,text,text,jsonb,text,text,jsonb,uuid,boolean),
  public.mc_gravar_proposta(uuid,integer,jsonb,text), public.mc_aprovar_proposta(uuid,integer),
  public.mc_gravar_documento(uuid,text,integer,jsonb), public.mc_aprovar_documento(uuid,integer),
  public.mc_ligar_social(uuid,integer,text,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mc_reservar_trabalhos(integer,integer), public.mc_avancar_trabalho(uuid,uuid,text,text,text),
  public.mc_reservar_chamada(uuid,uuid), public.mc_registar_chamada(uuid,text,text,integer,integer,numeric,boolean,text),
  public.mc_gravar_proposta_ia(uuid,uuid,uuid,jsonb),
  public.mc_registar_exportacao(uuid,integer,text,integer,text,text,text,integer) TO service_role;
