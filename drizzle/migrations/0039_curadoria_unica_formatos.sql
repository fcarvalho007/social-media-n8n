-- Additive migration: shared editorial approval is separate from edition membership/delivery.
BEGIN;
ALTER TABLE public.nl_noticias ADD COLUMN editorial_estado text NOT NULL DEFAULT 'pendente'
  CHECK (editorial_estado IN ('pendente','aprovada','rejeitada'));
ALTER TABLE public.nl_noticias ADD COLUMN editorial_revisto_em timestamptz;
ALTER TABLE public.nl_noticias ADD COLUMN curadoria_origem_id uuid REFERENCES public.nl_noticias(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX nl_curadoria_uma_selecao ON public.nl_noticias(edicao_id,curadoria_origem_id) WHERE curadoria_origem_id IS NOT NULL;
UPDATE public.nl_noticias SET editorial_estado = CASE WHEN estado IN ('aprovada','enviada') THEN 'aprovada'
  WHEN estado IN ('rejeitada','descartada') THEN 'rejeitada' ELSE 'pendente' END;
CREATE INDEX nl_noticias_editorial_data ON public.nl_noticias(editorial_estado, created_at DESC, id);

-- Approval in the incumbent newsletter curator also approves the shared source. A new edition/reset
-- must NOT revoke that editorial decision. Sent rows and edition membership are never rewritten here.
CREATE FUNCTION public.nl_sincronizar_editorial() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF (TG_OP='INSERT' OR NEW.estado IS DISTINCT FROM OLD.estado) AND NEW.estado IN ('aprovada','enviada') THEN
    NEW.editorial_estado := 'aprovada'; NEW.editorial_revisto_em := now();
  ELSIF (TG_OP='INSERT' OR NEW.estado IS DISTINCT FROM OLD.estado) AND NEW.estado IN ('rejeitada','descartada') THEN
    NEW.editorial_estado := 'rejeitada'; NEW.editorial_revisto_em := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER nl_editorial_sincronizar BEFORE INSERT OR UPDATE OF estado ON public.nl_noticias
  FOR EACH ROW EXECUTE FUNCTION public.nl_sincronizar_editorial();

CREATE FUNCTION public.nl_curadoria_decidir(_id uuid, _estado text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.nl_is_staff() THEN RAISE EXCEPTION 'sem acesso' USING ERRCODE='42501'; END IF;
  IF _estado NOT IN ('aprovada','rejeitada','pendente') THEN RAISE EXCEPTION 'decisão inválida' USING ERRCODE='22023'; END IF;
  UPDATE public.nl_noticias SET editorial_estado=_estado, editorial_revisto_em=now()
    WHERE id=_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'notícia inexistente' USING ERRCODE='P0002'; END IF;
END $$;

-- Only canonical source content contributes to the hash: moving it between editions is irrelevant.
CREATE FUNCTION public.nl_curadoria_snapshot(_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n public.nl_noticias; texto text; nivel text; hash text; parcial boolean := false;
BEGIN
  IF NOT public.nl_is_staff() THEN RAISE EXCEPTION 'sem acesso' USING ERRCODE='42501'; END IF;
  SELECT * INTO n FROM public.nl_noticias WHERE id=_id;
  IF NOT FOUND OR n.editorial_estado <> 'aprovada' THEN RAISE EXCEPTION 'fonte indisponível: aprova a notícia na curadoria' USING ERRCODE='MC409'; END IF;
  nivel := CASE WHEN length(btrim(coalesce(n.corpo_artigo,''))) > 0 THEN 'artigo' ELSE 'resumo' END;
  texto := CASE WHEN nivel='artigo' THEN btrim(n.corpo_artigo)
    ELSE concat_ws(E'\n\n', n.titulo, nullif(btrim(n.descricao),'')) END;
  hash := public.mc_hash(jsonb_build_object('id',n.id,'titulo',n.titulo,'url',n.url,'texto',texto,'nivel',nivel));
  -- Explicit bounded excerpt; the UI labels it, and the complete source remains in the curator.
  IF length(texto)>20000 THEN texto := left(texto,20000); parcial:=true; END IF;
  RETURN jsonb_build_object('noticia_id',n.id,'hash',hash,'titulo',n.titulo,'url',n.url,
    'texto',texto,'nivel',nivel,'parcial',parcial,'categoria',n.categoria,'origem',n.origem);
END $$;

CREATE FUNCTION public.nl_curadoria_listar(_estado text DEFAULT 'aprovada', _query text DEFAULT '',
  _categoria text DEFAULT '', _desde timestamptz DEFAULT NULL, _limite integer DEFAULT 24, _offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.nl_is_staff() THEN RAISE EXCEPTION 'sem acesso' USING ERRCODE='42501'; END IF;
  IF _estado NOT IN ('aprovada','pendente','rejeitada') OR _limite NOT BETWEEN 1 AND 50 OR _offset NOT BETWEEN 0 AND 100000 THEN
    RAISE EXCEPTION 'filtro inválido' USING ERRCODE='22023'; END IF;
  WITH filtradas AS (
    SELECT n.* FROM public.nl_noticias n WHERE n.curadoria_origem_id IS NULL AND n.editorial_estado=_estado
      AND (_categoria='' OR n.categoria=_categoria) AND (_desde IS NULL OR n.created_at>=_desde)
      AND (_query='' OR n.titulo ILIKE '%'||left(_query,200)||'%' OR n.descricao ILIKE '%'||left(_query,200)||'%')
  ), pagina AS (SELECT * FROM filtradas ORDER BY created_at DESC, id LIMIT _limite OFFSET _offset)
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtradas),'itens',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id',p.id,'titulo',p.titulo,'descricao',p.descricao,'url',p.url,'categoria',p.categoria,'origem',p.origem,
    'editorial_estado',p.editorial_estado,'estado_newsletter',p.estado,'edicao_id',p.edicao_id,'criado_em',p.created_at,
    'nivel',CASE WHEN length(btrim(coalesce(p.corpo_artigo,'')))>0 THEN 'artigo' ELSE 'resumo' END,
    'edicoes',coalesce((SELECT jsonb_agg(DISTINCT c.edicao_id) FROM public.nl_noticias c WHERE (c.id=p.id OR c.curadoria_origem_id=p.id) AND c.edicao_id IS NOT NULL),'[]'::jsonb),
    'usos',(SELECT count(*) FROM public.mc_trabalhos t JOIN public.mc_fontes f ON f.id=t.fonte_id WHERE coalesce((t.brief->>'framework'),'')='' AND t.brief->'regen' IS NULL AND f.metadados->>'noticia_id'=p.id::text AND public.mc_pode_ler(f.project_id))
  ) ORDER BY p.created_at DESC,p.id) FROM pagina p),'[]'::jsonb)) INTO r;
  RETURN r;
END $$;

ALTER TABLE public.mc_fontes DROP CONSTRAINT mc_fontes_tipo_check;
ALTER TABLE public.mc_fontes ADD CONSTRAINT mc_fontes_tipo_check CHECK (tipo IN ('texto','link','pdf','cronica','curadoria'));
-- Curated work is made atomically from a database snapshot, never from client-asserted news metadata.
-- Different format/brief generates a different key; retries with identical options reuse the same job.
CREATE FUNCTION public.mc_criar_trabalho_curadoria(_project_id uuid, _noticia_id uuid, _hash text, _brief jsonb,
  _prompt_versao text, _modelo text, _parametros jsonb, _nova boolean DEFAULT false)
RETURNS TABLE(trabalho_id uuid, fonte_id uuid, cache_chave text, reutilizado boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE snapshot jsonb; meta jsonb; fh text; fid uuid; ck text; tid uuid;
BEGIN
  IF NOT public.mc_pode_escrever(_project_id) THEN RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE='42501'; END IF;
  -- Hold a row lock so an approval/content change cannot race creation.
  PERFORM 1 FROM public.nl_noticias WHERE id=_noticia_id FOR SHARE;
  snapshot:=public.nl_curadoria_snapshot(_noticia_id);
  IF snapshot->>'hash' IS DISTINCT FROM _hash THEN RAISE EXCEPTION 'a fonte mudou; escolhe a notícia novamente' USING ERRCODE='MC409'; END IF;
  meta:=snapshot-'texto';
  fh:=public.mc_hash(jsonb_build_object('tipo','curadoria','snapshot',snapshot));
  INSERT INTO public.mc_fontes(project_id,tipo,titulo,origem_url,texto,metadados,hash,criado_por)
    VALUES (_project_id,'curadoria',left(snapshot->>'titulo',300),left(snapshot->>'url',2000),snapshot->>'texto',meta,fh,auth.uid())
    ON CONFLICT(project_id,hash) DO NOTHING;
  SELECT f.id INTO fid FROM public.mc_fontes f WHERE f.project_id=_project_id AND f.hash=fh;
  ck:=public.mc_hash(jsonb_build_object('projeto',_project_id,'fonte',fh,'prompt',_prompt_versao,'modelo',_modelo,
    'parametros',coalesce(_parametros,'{}'),'brief',coalesce(_brief,'{}'),'nova',CASE WHEN _nova THEN gen_random_uuid()::text END));
  INSERT INTO public.mc_trabalhos(project_id,fonte_id,brief,prompt_versao,modelo,parametros,cache_chave,explicito,criado_por)
    VALUES(_project_id,fid,coalesce(_brief,'{}'),_prompt_versao,_modelo,coalesce(_parametros,'{}'),ck,_nova,auth.uid())
    ON CONFLICT ON CONSTRAINT mc_trabalhos_cache_chave_key DO NOTHING RETURNING id INTO tid;
  IF tid IS NOT NULL THEN
    INSERT INTO public.mc_propostas(project_id,trabalho_id) VALUES(_project_id,tid);
    INSERT INTO public.mc_etapas(trabalho_id,etapa,estado) VALUES(tid,'fonte','criado');
    RETURN QUERY SELECT tid,fid,ck,false;
  ELSE RETURN QUERY SELECT t.id,fid,ck,true FROM public.mc_trabalhos t WHERE t.cache_chave=ck; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.mc_validar_documento(_d jsonb) RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE formato text := coalesce(_d->>'formato','carrossel');
BEGIN
  IF jsonb_typeof(_d) IS DISTINCT FROM 'object' OR (_d->>'v') IS DISTINCT FROM '1'
    OR (_d->>'variante') IS NULL OR (_d->>'variante') NOT IN ('A','B')
    OR formato NOT IN ('carrossel','post','story') OR (_d->>'largura') IS DISTINCT FROM '1080'
    OR (_d->>'altura') IS DISTINCT FROM (CASE WHEN formato='story' THEN '1920' ELSE '1350' END)
    OR jsonb_typeof(_d->'paginas') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'documento gráfico inválido' USING ERRCODE='22023'; END IF;
  IF jsonb_array_length(_d->'paginas') NOT BETWEEN 1 AND 20
    OR (formato<>'carrossel' AND jsonb_array_length(_d->'paginas')<>1) THEN
    RAISE EXCEPTION 'número de páginas inválido para o formato' USING ERRCODE='22023'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.mc_concluir_exportacao(_id uuid, _lease uuid, _manifesto jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.mc_export_trabalhos; png integer; pdf integer; doc jsonb; formato text;
BEGIN
  SELECT * INTO t FROM public.mc_export_trabalhos WHERE id=_id FOR UPDATE;
  IF NOT FOUND OR t.lease_token IS NULL OR t.lease_ate IS NULL OR t.lease_token IS DISTINCT FROM _lease OR t.lease_ate<=now() OR t.estado<>'a_processar' THEN RETURN false; END IF;
  SELECT documento INTO doc FROM public.mc_documentos_versoes WHERE documento_id=t.documento_id AND versao=t.documento_versao;
  formato:=coalesce(doc->>'formato','carrossel');
  SELECT count(*) FILTER (WHERE e.formato='png'),count(*) FILTER (WHERE e.formato='pdf' AND e.pagina IS NULL)
    INTO png,pdf FROM public.mc_exportacoes e WHERE e.documento_id=t.documento_id AND e.documento_versao=t.documento_versao;
  IF png<>t.paginas OR (formato='carrossel' AND pdf<>1) OR (formato<>'carrossel' AND (png<>1 OR pdf<>0)) THEN
    RAISE EXCEPTION 'exportação incompleta' USING ERRCODE='22023'; END IF;
  IF _manifesto->>'largura' IS DISTINCT FROM doc->>'largura' OR _manifesto->>'altura' IS DISTINCT FROM doc->>'altura' THEN
    RAISE EXCEPTION 'dimensões do manifesto diferentes do documento' USING ERRCODE='22023'; END IF;
  UPDATE public.mc_export_trabalhos SET estado='concluido',manifesto=_manifesto,lease_token=NULL,lease_ate=NULL,erro=NULL,erro_classe=NULL,
    concluido_em=now(),actualizado_em=now() WHERE id=_id;
  RETURN true;
END $$;

-- Reuse in a newsletter creates an edition-specific copy, never moves an existing/sent news row.
CREATE FUNCTION public.nl_curadoria_para_edicao(_id uuid,_edicao uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n public.nl_noticias; estado text; nid uuid; ordem integer;
BEGIN
  IF NOT public.nl_is_staff() THEN RAISE EXCEPTION 'sem acesso' USING ERRCODE='42501'; END IF;
  SELECT e.estado INTO estado FROM public.nl_edicoes e WHERE e.id=_edicao FOR UPDATE;
  IF estado IS DISTINCT FROM 'rascunho' THEN RAISE EXCEPTION 'a edição não é editável' USING ERRCODE='MC409'; END IF;
  SELECT * INTO n FROM public.nl_noticias WHERE id=_id FOR SHARE;
  IF NOT FOUND OR n.editorial_estado<>'aprovada' OR n.curadoria_origem_id IS NOT NULL THEN
    RAISE EXCEPTION 'aprova a fonte na curadoria' USING ERRCODE='MC409'; END IF;
  IF n.edicao_id=_edicao THEN RETURN n.id; END IF;
  SELECT id INTO nid FROM public.nl_noticias WHERE edicao_id=_edicao AND curadoria_origem_id=_id;
  IF nid IS NOT NULL THEN RETURN nid; END IF;
  SELECT coalesce(max(c.ordem),0)+1 INTO ordem FROM public.nl_noticias c WHERE c.edicao_id=_edicao;
  INSERT INTO public.nl_noticias(edicao_id,titulo,descricao,url,categoria,origem,estado,destino,ordem,fonte_id,corpo_artigo,
    editorial_estado,editorial_revisto_em,curadoria_origem_id,repeticao_de)
    VALUES(_edicao,n.titulo,n.descricao,n.url,n.categoria,n.origem,'aprovada','news',ordem,n.fonte_id,n.corpo_artigo,
      'aprovada',now(),_id,_id) RETURNING id INTO nid;
  RETURN nid;
END $$;

-- Regeneration/restructuring uses the origin job's immutable source, even if the news changed afterwards.
CREATE FUNCTION public.mc_criar_trabalho_derivado(_origem uuid,_brief jsonb,_prompt_versao text,_modelo text,_parametros jsonb)
RETURNS TABLE(trabalho_id uuid,fonte_id uuid,cache_chave text,reutilizado boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.mc_trabalhos; ck text; tid uuid;
BEGIN
  SELECT * INTO t FROM public.mc_trabalhos WHERE id=_origem;
  IF NOT FOUND OR NOT public.mc_pode_escrever(t.project_id) THEN RAISE EXCEPTION 'sem acesso' USING ERRCODE='42501'; END IF;
  ck:=public.mc_hash(jsonb_build_object('origem',t.id,'fonte',t.fonte_id,'brief',_brief,'prompt',_prompt_versao,'modelo',_modelo,'parametros',_parametros));
  INSERT INTO public.mc_trabalhos(project_id,fonte_id,brief,prompt_versao,modelo,parametros,cache_chave,explicito,criado_por)
    VALUES(t.project_id,t.fonte_id,_brief,_prompt_versao,_modelo,_parametros,ck,true,auth.uid())
    ON CONFLICT ON CONSTRAINT mc_trabalhos_cache_chave_key DO NOTHING RETURNING id INTO tid;
  IF tid IS NOT NULL THEN
    INSERT INTO public.mc_propostas(project_id,trabalho_id) VALUES(t.project_id,tid);
    INSERT INTO public.mc_etapas(trabalho_id,etapa,estado) VALUES(tid,'fonte','criado');
    RETURN QUERY SELECT tid,t.fonte_id,ck,false;
  ELSE RETURN QUERY SELECT j.id,t.fonte_id,ck,true FROM public.mc_trabalhos j WHERE j.cache_chave=ck; END IF;
END $$;
REVOKE ALL ON FUNCTION public.nl_curadoria_para_edicao(uuid,uuid),public.mc_criar_trabalho_derivado(uuid,jsonb,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.nl_curadoria_para_edicao(uuid,uuid),public.mc_criar_trabalho_derivado(uuid,jsonb,text,text,jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.nl_curadoria_decidir(uuid,text), public.nl_curadoria_snapshot(uuid),
 public.nl_curadoria_listar(text,text,text,timestamptz,integer,integer),
 public.mc_criar_trabalho_curadoria(uuid,uuid,text,jsonb,text,text,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.nl_curadoria_decidir(uuid,text), public.nl_curadoria_snapshot(uuid),
 public.nl_curadoria_listar(text,text,text,timestamptz,integer,integer),
 public.mc_criar_trabalho_curadoria(uuid,uuid,text,jsonb,text,text,jsonb,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.mc_preparar_social(_documento_id uuid, _versao integer, _proposta_versao integer)
RETURNS TABLE (draft_previsto uuid, draft_id uuid, project_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _d public.mc_documentos; _p public.mc_propostas; _pv integer; _novo uuid; _formato text;
BEGIN
  SELECT * INTO _d FROM public.mc_documentos WHERE id = _documento_id;
  IF NOT FOUND OR NOT public.mc_pode_escrever(_d.project_id) THEN RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE = '42501'; END IF;
  SELECT * INTO _p FROM public.mc_propostas WHERE id = _d.proposta_id FOR UPDATE;
  SELECT * INTO _d FROM public.mc_documentos WHERE id = _documento_id FOR UPDATE;
  SELECT v.proposta_versao,coalesce(v.documento->>'formato','carrossel') INTO _pv,_formato FROM public.mc_documentos_versoes v WHERE v.documento_id = _documento_id AND v.versao = _versao;
  -- MC409 (not 40001): a stale version is a business refusal, never a retryable serialization failure.
  IF _d.versao_actual <> _versao OR _p.versao_actual <> _proposta_versao OR _pv IS DISTINCT FROM _proposta_versao THEN
    RAISE EXCEPTION 'a versão mudou entretanto' USING ERRCODE = 'MC409';
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
  SELECT _d.project_id,_documento_id,_versao,destino,_novo,_proposta_versao,auth.uid()
    FROM unnest(CASE WHEN _formato='story' THEN ARRAY['instagram'] ELSE ARRAY['instagram','linkedin'] END) AS redes(destino)
  ON CONFLICT (documento_id, documento_versao, destino) DO NOTHING;
  RETURN QUERY SELECT l.draft_previsto, l.draft_id, l.project_id FROM public.mc_ligacoes_sociais l
   WHERE l.documento_id = _documento_id AND l.documento_versao = _versao AND l.destino = 'instagram';
END $$;
COMMIT;
