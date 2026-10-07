-- Additive scene materials. Asset bytes remain in the Hub's existing immutable project library.
CREATE OR REPLACE FUNCTION public.rv_validar_materiais(_project_id uuid,_documento jsonb) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v jsonb; c jsonb; a jsonb;
BEGIN
 FOR v IN SELECT * FROM jsonb_array_elements(_documento->'variantes') LOOP
  IF v ? 'materiais_revistos' AND (jsonb_typeof(v->'materiais_revistos') IS DISTINCT FROM 'string' OR v->>'materiais_revistos' !~ '^[0-9a-f]{64}$') THEN RAISE EXCEPTION 'Revisão dos materiais inválida' USING ERRCODE='22023'; END IF;
  FOR c IN SELECT * FROM jsonb_array_elements(v->'cenas') LOOP
   IF NOT c ? 'apoio' THEN CONTINUE; END IF;
   a:=c->'apoio';
   IF jsonb_typeof(a) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Material de apoio inválido' USING ERRCODE='22023'; END IF;
   IF coalesce(a->>'tipo','') NOT IN ('imagem','apresentador') OR EXISTS(SELECT 1 FROM jsonb_object_keys(a) k WHERE k NOT IN ('tipo','asset_id','nome')) OR (a ? 'nome' AND (jsonb_typeof(a->'nome') IS DISTINCT FROM 'string' OR length(a->>'nome')>200)) THEN RAISE EXCEPTION 'Material de apoio inválido' USING ERRCODE='22023'; END IF;
   IF a->>'tipo'='apresentador' THEN
    IF a ? 'asset_id' THEN RAISE EXCEPTION 'O apresentador não usa uma imagem de apoio' USING ERRCODE='22023'; END IF;
   ELSE
    IF jsonb_typeof(a->'asset_id') IS DISTINCT FROM 'string' OR a->>'asset_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Imagem inválida' USING ERRCODE='22023'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.mc_assets WHERE id=(a->>'asset_id')::uuid AND project_id=_project_id AND mime IN ('image/png','image/jpeg')) THEN RAISE EXCEPTION 'A imagem não pertence a este projeto ou deixou de estar disponível' USING ERRCODE='42501'; END IF;
   END IF;
  END LOOP;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.rv_validar_materiais(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rv_validar_materiais(uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.rv_guardar(_id uuid,_revisao integer,_brief jsonb,_documento jsonb) RETURNS public.rv_roteiros LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.rv_roteiros;
BEGIN
 SELECT * INTO r FROM public.rv_roteiros WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR NOT public.mc_pode_escrever(r.project_id) THEN RAISE EXCEPTION 'Sem acesso ao roteiro' USING ERRCODE='42501'; END IF;
 IF r.revisao<>_revisao THEN RAISE EXCEPTION 'O roteiro mudou noutro separador. Copia o teu texto antes de recarregar.' USING ERRCODE='MC409'; END IF;
 PERFORM public.rv_validar(_brief,_documento);
 PERFORM public.rv_validar_materiais(r.project_id,_documento);
 UPDATE public.rv_roteiros SET brief=_brief,documento=_documento,revisao=revisao+1,atualizado_em=now() WHERE id=_id RETURNING * INTO r;
 INSERT INTO public.rv_versoes(roteiro_id,revisao,brief,documento) VALUES(r.id,r.revisao,r.brief,r.documento);
 RETURN r;
END $$;
