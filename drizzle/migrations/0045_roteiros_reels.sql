-- Additive module; existing sources, newsletter and graphic documents are preserved.
CREATE TABLE public.rv_roteiros (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.projects(id),
 fonte jsonb NOT NULL, brief jsonb NOT NULL, documento jsonb NOT NULL DEFAULT '{"variantes":[],"selecionada":null}',
 revisao integer NOT NULL DEFAULT 1, criado_por uuid NOT NULL DEFAULT auth.uid(),
 criado_em timestamptz NOT NULL DEFAULT now(), atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rv_versoes (
 roteiro_id uuid NOT NULL REFERENCES public.rv_roteiros(id), revisao integer NOT NULL,
 brief jsonb NOT NULL, documento jsonb NOT NULL, criado_por uuid NOT NULL DEFAULT auth.uid(), criado_em timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(roteiro_id,revisao)
);
CREATE TABLE public.rv_geracoes (
 id uuid PRIMARY KEY, roteiro_id uuid NOT NULL REFERENCES public.rv_roteiros(id), project_id uuid NOT NULL REFERENCES public.projects(id),
 revisao_base integer NOT NULL, brief jsonb NOT NULL, estado text NOT NULL DEFAULT 'a_processar' CHECK(estado IN ('a_processar','concluida','erro','desconhecido')),
 resultado jsonb, erro text, criado_em timestamptz NOT NULL DEFAULT now(), terminado_em timestamptz
);
CREATE INDEX rv_roteiros_projeto ON public.rv_roteiros(project_id,atualizado_em DESC);
CREATE INDEX rv_geracoes_roteiro ON public.rv_geracoes(roteiro_id,criado_em DESC);
ALTER TABLE public.rv_roteiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rv_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rv_geracoes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.rv_roteiros,public.rv_versoes,public.rv_geracoes TO authenticated;
GRANT ALL ON public.rv_roteiros,public.rv_versoes,public.rv_geracoes TO service_role;
CREATE POLICY rv_ler ON public.rv_roteiros FOR SELECT TO authenticated USING(public.mc_pode_ler(project_id));
CREATE POLICY rv_ler ON public.rv_versoes FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.rv_roteiros r WHERE r.id=roteiro_id AND public.mc_pode_ler(r.project_id)));
CREATE POLICY rv_ler ON public.rv_geracoes FOR SELECT TO authenticated USING(public.mc_pode_ler(project_id));

CREATE FUNCTION public.rv_validar(_brief jsonb,_documento jsonb) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v jsonb; c jsonb;
BEGIN
 IF jsonb_typeof(_brief) IS DISTINCT FROM 'object' OR octet_length(_brief::text)>4000
 OR jsonb_typeof(_brief->'duracao') IS DISTINCT FROM 'number' OR (_brief->>'duracao')::numeric NOT BETWEEN 15 AND 180 OR (_brief->>'duracao')::numeric<>trunc((_brief->>'duracao')::numeric)
 OR jsonb_typeof(_brief->'ppm') IS DISTINCT FROM 'number' OR (_brief->>'ppm')::numeric NOT BETWEEN 90 AND 220 OR (_brief->>'ppm')::numeric<>trunc((_brief->>'ppm')::numeric)
 OR jsonb_typeof(_brief->'publico') IS DISTINCT FROM 'string' OR length(_brief->>'publico')>300
 OR jsonb_typeof(_brief->'objetivo') IS DISTINCT FROM 'string' OR length(_brief->>'objetivo')>500
 OR jsonb_typeof(_brief->'frameworks') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Briefing inválido' USING ERRCODE='22023'; END IF;
 IF jsonb_array_length(_brief->'frameworks') NOT BETWEEN 1 AND 3
 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(_brief->'frameworks') f WHERE f NOT IN ('hva','pas','aida','bab','vsl'))
 OR (SELECT count(DISTINCT f) FROM jsonb_array_elements_text(_brief->'frameworks') f)<>jsonb_array_length(_brief->'frameworks') THEN RAISE EXCEPTION 'Escolhe entre uma e três estruturas diferentes' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(_documento) IS DISTINCT FROM 'object' OR octet_length(_documento::text)>250000 OR jsonb_typeof(_documento->'variantes') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Documento inválido' USING ERRCODE='22023'; END IF;
 IF jsonb_array_length(_documento->'variantes')>20 THEN RAISE EXCEPTION 'Limite de 20 versões de escrita por roteiro' USING ERRCODE='22023'; END IF;
 IF (SELECT count(DISTINCT j->>'id') FROM jsonb_array_elements(_documento->'variantes') j)<>jsonb_array_length(_documento->'variantes') THEN RAISE EXCEPTION 'Identificadores repetidos' USING ERRCODE='22023'; END IF;
 IF NOT (_documento ? 'selecionada') OR (_documento->'selecionada'<>'null'::jsonb AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(_documento->'variantes') j WHERE j->>'id'=_documento->>'selecionada')) THEN RAISE EXCEPTION 'Seleção inválida' USING ERRCODE='22023'; END IF;
 FOR v IN SELECT * FROM jsonb_array_elements(_documento->'variantes') LOOP
  IF jsonb_typeof(v->'id') IS DISTINCT FROM 'string' OR coalesce(length(v->>'id'),0) NOT BETWEEN 1 AND 100 OR coalesce(v->>'framework','') NOT IN ('hva','pas','aida','bab','vsl') OR jsonb_typeof(v->'titulo') IS DISTINCT FROM 'string' OR length(v->>'titulo')>200 OR jsonb_typeof(v->'notas') IS DISTINCT FROM 'string' OR length(v->>'notas')>4000 OR jsonb_typeof(v->'cenas') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Variante inválida' USING ERRCODE='22023'; END IF;
  IF jsonb_array_length(v->'cenas') NOT BETWEEN 1 AND 30 OR (SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(v->'cenas') x)<>jsonb_array_length(v->'cenas') THEN RAISE EXCEPTION 'Cenas inválidas' USING ERRCODE='22023'; END IF;
  FOR c IN SELECT * FROM jsonb_array_elements(v->'cenas') LOOP
   IF jsonb_typeof(c->'id') IS DISTINCT FROM 'string' OR coalesce(length(c->>'id'),0) NOT BETWEEN 1 AND 100 OR jsonb_typeof(c->'etapa') IS DISTINCT FROM 'string' OR length(c->>'etapa')>100 OR jsonb_typeof(c->'locucao') IS DISTINCT FROM 'string' OR length(c->>'locucao')>3000 OR jsonb_typeof(c->'visual') IS DISTINCT FROM 'string' OR length(c->>'visual')>1000 OR jsonb_typeof(c->'palavras') IS DISTINCT FROM 'array' OR jsonb_typeof(c->'referencias') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Cena inválida' USING ERRCODE='22023'; END IF;
   IF jsonb_array_length(c->'palavras')>12 OR EXISTS(SELECT 1 FROM jsonb_array_elements(c->'palavras') x WHERE jsonb_typeof(x)<>'string' OR length(x#>>'{}')>100) OR jsonb_array_length(c->'referencias')>100 OR EXISTS(SELECT 1 FROM jsonb_array_elements(c->'referencias') x WHERE jsonb_typeof(x)<>'number' OR (x#>>'{}')::numeric<1 OR (x#>>'{}')::numeric<>trunc((x#>>'{}')::numeric)) THEN RAISE EXCEPTION 'Notas visuais inválidas' USING ERRCODE='22023'; END IF;
  END LOOP;
 END LOOP;
END $$;
CREATE FUNCTION public.rv_criar(_id uuid,_project_id uuid,_fonte jsonb,_brief jsonb) RETURNS public.rv_roteiros LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.rv_roteiros; s jsonb;
BEGIN
 IF NOT public.mc_pode_escrever(_project_id) THEN RAISE EXCEPTION 'Sem acesso ao projeto' USING ERRCODE='42501'; END IF;
 PERFORM public.rv_validar(_brief,'{"variantes":[],"selecionada":null}');
 IF _fonte->>'tipo'='curadoria' THEN
  s:=public.nl_curadoria_snapshot((_fonte->>'noticia_id')::uuid);
  IF s->>'hash' IS DISTINCT FROM _fonte->>'hash' THEN RAISE EXCEPTION 'A notícia mudou. Escolhe-a novamente.' USING ERRCODE='MC409'; END IF;
  s:=s||'{"tipo":"curadoria"}'::jsonb;
 ELSIF _fonte->>'tipo'='texto' THEN
  IF jsonb_typeof(_fonte->'texto') IS DISTINCT FROM 'string' OR length(btrim(_fonte->>'texto')) NOT BETWEEN 40 AND 60000 OR jsonb_typeof(_fonte->'titulo') IS DISTINCT FROM 'string' OR length(btrim(_fonte->>'titulo')) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Indica um título e texto entre 40 e 60000 caracteres' USING ERRCODE='22023'; END IF;
  s:=jsonb_build_object('tipo','texto','titulo',btrim(_fonte->>'titulo'),'texto',btrim(_fonte->>'texto'),'url',null,'nivel','texto');
 ELSE RAISE EXCEPTION 'Fonte inválida' USING ERRCODE='22023'; END IF;
 INSERT INTO public.rv_roteiros(id,project_id,fonte,brief) VALUES(_id,_project_id,s,_brief) ON CONFLICT(id) DO NOTHING RETURNING * INTO r;
 IF r.id IS NULL THEN
  SELECT * INTO r FROM public.rv_roteiros WHERE id=_id AND project_id=_project_id AND criado_por=auth.uid();
  IF r.id IS NULL OR r.fonte IS DISTINCT FROM s OR r.brief IS DISTINCT FROM _brief THEN RAISE EXCEPTION 'Pedido de criação em conflito' USING ERRCODE='MC409'; END IF;
 ELSE INSERT INTO public.rv_versoes(roteiro_id,revisao,brief,documento) VALUES(r.id,r.revisao,r.brief,r.documento);
 END IF;
 RETURN r;
END $$;
CREATE FUNCTION public.rv_guardar(_id uuid,_revisao integer,_brief jsonb,_documento jsonb) RETURNS public.rv_roteiros LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.rv_roteiros;
BEGIN
 SELECT * INTO r FROM public.rv_roteiros WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR NOT public.mc_pode_escrever(r.project_id) THEN RAISE EXCEPTION 'Sem acesso ao roteiro' USING ERRCODE='42501'; END IF;
 IF r.revisao<>_revisao THEN RAISE EXCEPTION 'O roteiro mudou noutro separador. Copia o teu texto antes de recarregar.' USING ERRCODE='MC409'; END IF;
 PERFORM public.rv_validar(_brief,_documento);
 UPDATE public.rv_roteiros SET brief=_brief,documento=_documento,revisao=revisao+1,atualizado_em=now() WHERE id=_id RETURNING * INTO r;
 INSERT INTO public.rv_versoes(roteiro_id,revisao,brief,documento) VALUES(r.id,r.revisao,r.brief,r.documento);
 RETURN r;
END $$;
CREATE FUNCTION public.rv_reservar(_id uuid,_roteiro_id uuid,_revisao integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.rv_roteiros; g public.rv_geracoes; limite integer; chamadas integer; dia timestamptz;
BEGIN
 SELECT * INTO r FROM public.rv_roteiros WHERE id=_roteiro_id FOR UPDATE;
 IF NOT FOUND OR NOT public.mc_pode_escrever(r.project_id) THEN RAISE EXCEPTION 'Sem acesso ao roteiro' USING ERRCODE='42501'; END IF;
 SELECT * INTO g FROM public.rv_geracoes WHERE id=_id;
 IF FOUND THEN
  IF g.roteiro_id<>r.id THEN RAISE EXCEPTION 'Pedido inválido' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('nova',false,'geracao',to_jsonb(g));
 END IF;
 IF r.revisao<>_revisao THEN RAISE EXCEPTION 'Guarda e recarrega a versão atual antes de gerar' USING ERRCODE='MC409'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('rv_orcamento:'||r.project_id::text));
 UPDATE public.rv_geracoes SET estado='desconhecido',erro='O pedido ficou sem resposta confirmada. Não será repetido automaticamente.',terminado_em=now() WHERE roteiro_id=r.id AND estado='a_processar' AND criado_em<now()-interval '5 minutes';
 IF EXISTS(SELECT 1 FROM public.rv_geracoes WHERE roteiro_id=r.id AND estado='a_processar') THEN RAISE EXCEPTION 'Já existe uma geração em curso' USING ERRCODE='MC409'; END IF;
 SELECT max_chamadas_dia INTO limite FROM public.mc_orcamentos WHERE project_id=r.project_id;
 IF coalesce(limite,0)=0 THEN RAISE EXCEPTION 'A IA está desligada neste projeto. Define um limite diário em Limites da IA.' USING ERRCODE='P0002'; END IF;
 dia:=date_trunc('day',now() AT TIME ZONE 'Europe/Lisbon') AT TIME ZONE 'Europe/Lisbon';
 SELECT count(*) INTO chamadas FROM public.rv_geracoes WHERE project_id=r.project_id AND criado_em>=dia;
 IF chamadas>=limite THEN RAISE EXCEPTION 'Limite diário de gerações de roteiros atingido' USING ERRCODE='P0003'; END IF;
 INSERT INTO public.rv_geracoes(id,roteiro_id,project_id,revisao_base,brief) VALUES(_id,r.id,r.project_id,r.revisao,r.brief) RETURNING * INTO g;
 RETURN jsonb_build_object('nova',true,'geracao',to_jsonb(g));
END $$;
REVOKE ALL ON FUNCTION public.rv_validar(jsonb,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rv_criar(uuid,uuid,jsonb,jsonb),public.rv_guardar(uuid,integer,jsonb,jsonb),public.rv_reservar(uuid,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rv_criar(uuid,uuid,jsonb,jsonb),public.rv_guardar(uuid,integer,jsonb,jsonb),public.rv_reservar(uuid,uuid,integer) TO authenticated;
-- Commit provider outcome and cost evidence together; it never changes the user's editable document.
CREATE FUNCTION public.rv_concluir(_id uuid,_estado text,_resultado jsonb,_erro text,_modelo text,_entrada integer,_saida integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g public.rv_geracoes;
BEGIN
 IF _estado NOT IN ('concluida','erro','desconhecido') THEN RAISE EXCEPTION 'Estado inválido'; END IF;
 SELECT * INTO g FROM public.rv_geracoes WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR g.estado<>'a_processar' THEN RETURN false; END IF;
 IF _estado='concluida' THEN PERFORM public.rv_validar(g.brief,_resultado); END IF;
 UPDATE public.rv_geracoes SET estado=_estado,resultado=_resultado,erro=left(_erro,1000),terminado_em=now() WHERE id=_id;
 INSERT INTO public.custos_ia(fornecedor,modelo,acao,estado,origem_id,unidades,custo_origem,project_id)
 VALUES('deepseek',_modelo,'roteiro_reels',_estado,'roteiro:'||_id,jsonb_build_object('tokens_entrada',_entrada,'tokens_saida',_saida),'desconhecido',g.project_id) ON CONFLICT(origem_id) DO NOTHING;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.rv_concluir(uuid,text,jsonb,text,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rv_concluir(uuid,text,jsonb,text,text,integer,integer) TO service_role;
