ALTER TABLE public.mc_export_trabalhos ADD COLUMN IF NOT EXISTS interrupcoes integer NOT NULL DEFAULT 0;

-- A run killed by the runtime (CPU/memory) never reaches its catch: the job stays 'a_processar' with an expired lease.
-- Count those reclaims; the third one turns the job into a visible failure instead of retrying forever.
CREATE OR REPLACE FUNCTION public.mc_reservar_exportacoes(_limite integer DEFAULT 1, _segundos integer DEFAULT 150)
 RETURNS SETOF mc_export_trabalhos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.mc_export_trabalhos x SET estado = 'erro', erro_classe = 'tempo', lease_token = NULL, lease_ate = NULL, actualizado_em = now(),
    erro = 'O servidor foi interrompido várias vezes ao desenhar a mesma página. As páginas já feitas ficam guardadas.'
  WHERE x.estado = 'a_processar' AND x.lease_ate < now() AND (x.interrupcoes >= 2 OR x.tentativas >= 8);
  RETURN QUERY
  UPDATE public.mc_export_trabalhos t SET estado = 'a_processar', lease_token = gen_random_uuid(),
    lease_ate = now() + make_interval(secs => least(greatest(_segundos,30),600)), tentativas = t.tentativas + 1,
    interrupcoes = CASE WHEN t.estado = 'a_processar' THEN t.interrupcoes + 1 ELSE t.interrupcoes END, actualizado_em = now()
  WHERE t.id IN (
    SELECT x.id FROM public.mc_export_trabalhos x
    WHERE (x.estado = 'pendente' OR (x.estado = 'a_processar' AND x.lease_ate < now())) AND x.tentativas < 8
    ORDER BY x.criado_em FOR UPDATE SKIP LOCKED LIMIT least(greatest(_limite,1),5))
  RETURNING t.*;
END $function$;

-- Explicit retry also resets the interruption counter (files already registered are reused, never rewritten).
CREATE OR REPLACE FUNCTION public.mc_pedir_exportacao(_documento_id uuid, _versao integer)
 RETURNS TABLE(exportacao_id uuid, estado text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _d public.mc_documentos; _n integer;
BEGIN
  SELECT * INTO _d FROM public.mc_documentos WHERE id = _documento_id;
  IF NOT FOUND OR NOT public.mc_pode_escrever(_d.project_id) THEN RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_array_length(v.documento->'paginas') INTO _n FROM public.mc_documentos_versoes v WHERE v.documento_id = _documento_id AND v.versao = _versao;
  IF _n IS NULL THEN RAISE EXCEPTION 'versão inexistente' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.mc_export_trabalhos (project_id, documento_id, documento_versao, paginas, criado_por)
  VALUES (_d.project_id, _documento_id, _versao, least(greatest(_n,1),20), auth.uid())
  ON CONFLICT (documento_id, documento_versao) DO NOTHING;
  UPDATE public.mc_export_trabalhos t SET estado = 'pendente', tentativas = 0, interrupcoes = 0, erro = NULL, erro_classe = NULL, actualizado_em = now()
  WHERE t.documento_id = _documento_id AND t.documento_versao = _versao AND t.estado = 'erro';
  RETURN QUERY SELECT t.id, t.estado FROM public.mc_export_trabalhos t WHERE t.documento_id = _documento_id AND t.documento_versao = _versao;
END $function$;

-- Browser-rendered social files: the server (service role) closes the export once every file is registered.
-- No lease needed: the files themselves are the evidence, counted here exactly like mc_concluir_exportacao.
CREATE OR REPLACE FUNCTION public.mc_concluir_exportacao_cliente(_documento_id uuid, _versao integer, _manifesto jsonb, _criado_por uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _pid uuid; _n integer; png integer; pdf integer; doc jsonb; formato text;
BEGIN
  SELECT d.project_id, v.documento INTO _pid, doc FROM public.mc_documentos d JOIN public.mc_documentos_versoes v ON v.documento_id = d.id AND v.versao = _versao WHERE d.id = _documento_id;
  IF _pid IS NULL THEN RAISE EXCEPTION 'versão inexistente' USING ERRCODE = 'P0002'; END IF;
  _n := least(greatest(jsonb_array_length(doc->'paginas'),1),20);
  formato := coalesce(doc->>'formato','carrossel');
  SELECT count(*) FILTER (WHERE e.formato='png'), count(*) FILTER (WHERE e.formato='pdf' AND e.pagina IS NULL)
    INTO png, pdf FROM public.mc_exportacoes e WHERE e.documento_id=_documento_id AND e.documento_versao=_versao;
  IF png<>_n OR (formato='carrossel' AND pdf<>1) OR (formato<>'carrossel' AND (png<>1 OR pdf<>0)) THEN RETURN false; END IF;
  IF _manifesto->>'largura' IS DISTINCT FROM doc->>'largura' OR _manifesto->>'altura' IS DISTINCT FROM doc->>'altura' THEN
    RAISE EXCEPTION 'dimensões do manifesto diferentes do documento' USING ERRCODE='22023'; END IF;
  INSERT INTO public.mc_export_trabalhos (project_id, documento_id, documento_versao, paginas, criado_por)
  VALUES (_pid, _documento_id, _versao, _n, _criado_por)
  ON CONFLICT (documento_id, documento_versao) DO NOTHING;
  UPDATE public.mc_export_trabalhos SET estado='concluido', manifesto=_manifesto, paginas=_n, lease_token=NULL, lease_ate=NULL, erro=NULL, erro_classe=NULL,
    progresso=jsonb_build_object('paginas_feitas', _n, 'total', _n), concluido_em=now(), actualizado_em=now()
  WHERE documento_id=_documento_id AND documento_versao=_versao AND estado<>'concluido';
  RETURN true;
END $function$;
REVOKE ALL ON FUNCTION public.mc_concluir_exportacao_cliente(uuid, integer, jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mc_concluir_exportacao_cliente(uuid, integer, jsonb, uuid) TO service_role;

-- Jobs already stuck forever (runtime-killed, attempts exhausted) become visible failures; no file is deleted.
UPDATE public.mc_export_trabalhos SET estado = 'erro', erro_classe = 'tempo', lease_token = NULL, lease_ate = NULL, actualizado_em = now(),
  erro = 'O servidor foi interrompido várias vezes ao desenhar a mesma página. As páginas já feitas ficam guardadas.'
WHERE estado = 'a_processar' AND lease_ate < now() AND tentativas >= 8;