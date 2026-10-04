-- R6: server-side export jobs (mutable staging state) + idempotent social draft preparation.
CREATE TABLE public.mc_export_trabalhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  documento_id uuid NOT NULL,
  documento_versao integer NOT NULL,
  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','a_processar','concluido','erro')),
  lease_token uuid,
  lease_ate timestamptz,
  tentativas integer NOT NULL DEFAULT 0,
  erro text CHECK (char_length(erro) <= 500),
  erro_classe text CHECK (erro_classe IN ('documento','memoria','tempo','armazenamento','renderizacao','desconhecido')),
  paginas integer CHECK (paginas BETWEEN 1 AND 20),
  progresso jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(progresso::text) <= 20000),
  manifesto jsonb CHECK (manifesto IS NULL OR octet_length(manifesto::text) <= 50000),
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  actualizado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz,
  FOREIGN KEY (documento_id, documento_versao) REFERENCES public.mc_documentos_versoes(documento_id, versao) ON DELETE RESTRICT,
  UNIQUE (documento_id, documento_versao)
);
GRANT SELECT ON public.mc_export_trabalhos TO authenticated;
GRANT ALL ON public.mc_export_trabalhos TO service_role;
ALTER TABLE public.mc_export_trabalhos ENABLE ROW LEVEL SECURITY;
CREATE POLICY mc_ler ON public.mc_export_trabalhos FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));

-- PDF/ZIP have no page number; NULLs are distinct in the existing UNIQUE, so dedupe them explicitly.
CREATE UNIQUE INDEX IF NOT EXISTS mc_exportacoes_ficheiro_unico ON public.mc_exportacoes (documento_id, documento_versao, formato) WHERE pagina IS NULL;

ALTER TABLE public.mc_ligacoes_sociais ADD COLUMN IF NOT EXISTS draft_previsto uuid;
ALTER TABLE public.mc_ligacoes_sociais ADD COLUMN IF NOT EXISTS proposta_versao integer;

CREATE OR REPLACE FUNCTION public.mc_pedir_exportacao(_documento_id uuid, _versao integer)
RETURNS TABLE (exportacao_id uuid, estado text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _d public.mc_documentos; _n integer;
BEGIN
  SELECT * INTO _d FROM public.mc_documentos WHERE id = _documento_id;
  IF NOT FOUND OR NOT public.mc_pode_escrever(_d.project_id) THEN RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_array_length(v.documento->'paginas') INTO _n FROM public.mc_documentos_versoes v WHERE v.documento_id = _documento_id AND v.versao = _versao;
  IF _n IS NULL THEN RAISE EXCEPTION 'versão inexistente' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.mc_export_trabalhos (project_id, documento_id, documento_versao, paginas, criado_por)
  VALUES (_d.project_id, _documento_id, _versao, least(greatest(_n,1),20), auth.uid())
  ON CONFLICT (documento_id, documento_versao) DO NOTHING;
  -- explicit retry of a failed export keeps already-registered files (they are reused, never rewritten)
  UPDATE public.mc_export_trabalhos t SET estado = 'pendente', tentativas = 0, erro = NULL, erro_classe = NULL, actualizado_em = now()
  WHERE t.documento_id = _documento_id AND t.documento_versao = _versao AND t.estado = 'erro';
  RETURN QUERY SELECT t.id, t.estado FROM public.mc_export_trabalhos t WHERE t.documento_id = _documento_id AND t.documento_versao = _versao;
END $$;

CREATE OR REPLACE FUNCTION public.mc_reservar_exportacoes(_limite integer DEFAULT 1, _segundos integer DEFAULT 150)
RETURNS SETOF public.mc_export_trabalhos LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  UPDATE public.mc_export_trabalhos t SET estado = 'a_processar', lease_token = gen_random_uuid(),
    lease_ate = now() + make_interval(secs => least(greatest(_segundos,30),600)), tentativas = t.tentativas + 1, actualizado_em = now()
  WHERE t.id IN (
    SELECT x.id FROM public.mc_export_trabalhos x
    WHERE (x.estado = 'pendente' OR (x.estado = 'a_processar' AND x.lease_ate < now())) AND x.tentativas < 8
    ORDER BY x.criado_em FOR UPDATE SKIP LOCKED LIMIT least(greatest(_limite,1),5))
  RETURNING t.*;
END $$;

CREATE OR REPLACE FUNCTION public.mc_exportacao_progresso(_id uuid, _lease uuid, _progresso jsonb, _estado text DEFAULT 'a_processar',
  _erro text DEFAULT NULL, _classe text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _estado NOT IN ('a_processar','pendente','erro') THEN RAISE EXCEPTION 'estado inválido' USING ERRCODE = '22023'; END IF;
  UPDATE public.mc_export_trabalhos SET progresso = coalesce(_progresso, progresso), estado = _estado, erro = left(_erro, 500), erro_classe = _classe,
    lease_token = CASE WHEN _estado = 'a_processar' THEN lease_token END,
    lease_ate = CASE WHEN _estado = 'a_processar' THEN lease_ate END, actualizado_em = now()
  WHERE id = _id AND lease_token = _lease AND lease_ate > now() AND estado = 'a_processar';
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.mc_concluir_exportacao(_id uuid, _lease uuid, _manifesto jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t public.mc_export_trabalhos; _png integer; _outros integer;
BEGIN
  SELECT * INTO _t FROM public.mc_export_trabalhos WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR _t.lease_token IS DISTINCT FROM _lease OR _t.lease_ate <= now() OR _t.estado <> 'a_processar' THEN RETURN false; END IF;
  SELECT count(*) INTO _png FROM public.mc_exportacoes e WHERE e.documento_id = _t.documento_id AND e.documento_versao = _t.documento_versao AND e.formato = 'png';
  SELECT count(*) INTO _outros FROM public.mc_exportacoes e WHERE e.documento_id = _t.documento_id AND e.documento_versao = _t.documento_versao AND e.formato IN ('pdf','zip') AND e.pagina IS NULL;
  IF _png <> _t.paginas OR _outros <> 2 THEN RAISE EXCEPTION 'exportação incompleta' USING ERRCODE = '22023'; END IF;
  UPDATE public.mc_export_trabalhos SET estado = 'concluido', manifesto = _manifesto, lease_token = NULL, lease_ate = NULL, erro = NULL, erro_classe = NULL,
    concluido_em = now(), actualizado_em = now() WHERE id = _id;
  RETURN true;
END $$;

-- Explicit human review of the CURRENT versions: approves proposal + document atomically and reserves one draft id per document version.
CREATE OR REPLACE FUNCTION public.mc_preparar_social(_documento_id uuid, _versao integer, _proposta_versao integer)
RETURNS TABLE (draft_previsto uuid, draft_id uuid, project_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _d public.mc_documentos; _p public.mc_propostas; _pv integer; _novo uuid;
BEGIN
  SELECT * INTO _d FROM public.mc_documentos WHERE id = _documento_id;
  IF NOT FOUND OR NOT public.mc_pode_escrever(_d.project_id) THEN RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE = '42501'; END IF;
  SELECT * INTO _p FROM public.mc_propostas WHERE id = _d.proposta_id FOR UPDATE;
  SELECT * INTO _d FROM public.mc_documentos WHERE id = _documento_id FOR UPDATE;
  SELECT v.proposta_versao INTO _pv FROM public.mc_documentos_versoes v WHERE v.documento_id = _documento_id AND v.versao = _versao;
  IF _d.versao_actual <> _versao OR _p.versao_actual <> _proposta_versao OR _pv IS DISTINCT FROM _proposta_versao THEN
    RAISE EXCEPTION 'a versão mudou entretanto' USING ERRCODE = '40001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.mc_export_trabalhos t WHERE t.documento_id = _documento_id AND t.documento_versao = _versao AND t.estado = 'concluido') THEN
    RAISE EXCEPTION 'exporta esta versão antes de preparar o rascunho' USING ERRCODE = '22023';
  END IF;
  IF _p.aprovada_versao IS DISTINCT FROM _proposta_versao THEN
    UPDATE public.mc_propostas SET aprovada_versao = _proposta_versao, aprovada_por = auth.uid(), aprovada_em = now(), actualizado_em = now() WHERE id = _p.id;
  END IF;
  IF _d.aprovada_versao IS DISTINCT FROM _versao THEN
    UPDATE public.mc_documentos SET aprovada_versao = _versao, aprovada_por = auth.uid(), aprovada_em = now(), actualizado_em = now() WHERE id = _d.id;
  END IF;
  SELECT l.draft_previsto INTO _novo FROM public.mc_ligacoes_sociais l
   WHERE l.documento_id = _documento_id AND l.documento_versao = _versao AND l.draft_previsto IS NOT NULL LIMIT 1;
  IF _novo IS NULL THEN _novo := gen_random_uuid(); END IF;
  INSERT INTO public.mc_ligacoes_sociais (project_id, documento_id, documento_versao, destino, draft_previsto, proposta_versao, criado_por)
  VALUES (_d.project_id, _documento_id, _versao, 'instagram', _novo, _proposta_versao, auth.uid()),
         (_d.project_id, _documento_id, _versao, 'linkedin', _novo, _proposta_versao, auth.uid())
  ON CONFLICT (documento_id, documento_versao, destino) DO NOTHING;
  RETURN QUERY SELECT l.draft_previsto, l.draft_id, l.project_id FROM public.mc_ligacoes_sociais l
   WHERE l.documento_id = _documento_id AND l.documento_versao = _versao AND l.destino = 'instagram';
END $$;

CREATE OR REPLACE FUNCTION public.mc_confirmar_draft(_documento_id uuid, _versao integer, _draft uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  UPDATE public.mc_ligacoes_sociais SET draft_id = _draft
  WHERE documento_id = _documento_id AND documento_versao = _versao AND draft_previsto = _draft AND draft_id IS NULL;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;

REVOKE ALL ON FUNCTION public.mc_pedir_exportacao(uuid,integer), public.mc_reservar_exportacoes(integer,integer),
  public.mc_exportacao_progresso(uuid,uuid,jsonb,text,text,text), public.mc_concluir_exportacao(uuid,uuid,jsonb),
  public.mc_preparar_social(uuid,integer,integer), public.mc_confirmar_draft(uuid,integer,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mc_pedir_exportacao(uuid,integer), public.mc_preparar_social(uuid,integer,integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mc_reservar_exportacoes(integer,integer), public.mc_exportacao_progresso(uuid,uuid,jsonb,text,text,text),
  public.mc_concluir_exportacao(uuid,uuid,jsonb), public.mc_confirmar_draft(uuid,integer,uuid) TO service_role;