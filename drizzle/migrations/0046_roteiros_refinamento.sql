-- Refinements share the existing job/budget/version infrastructure. No direct client writes.
ALTER TABLE public.rv_geracoes ADD COLUMN contexto jsonb;
CREATE FUNCTION public.rv_reservar_contexto(_id uuid,_roteiro_id uuid,_revisao integer,_modo text DEFAULT 'roteiro',_variante_id text DEFAULT NULL,_cena_id text DEFAULT NULL,_estilo text DEFAULT 'alternativa') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.rv_roteiros; g public.rv_geracoes; v jsonb; c jsonb; reserva jsonb;
BEGIN
 SELECT * INTO r FROM public.rv_roteiros WHERE id=_roteiro_id FOR UPDATE;
 IF NOT FOUND OR NOT public.mc_pode_escrever(r.project_id) THEN RAISE EXCEPTION 'Sem acesso ao roteiro' USING ERRCODE='42501'; END IF;
 IF _modo IS NULL OR _modo NOT IN ('roteiro','trecho','visual') OR _estilo IS NULL OR _estilo NOT IN ('alternativa','pergunta','direto','mais_curto') THEN RAISE EXCEPTION 'Pedido inválido' USING ERRCODE='22023'; END IF;
 SELECT * INTO g FROM public.rv_geracoes WHERE id=_id;
 IF FOUND THEN
  IF g.roteiro_id<>r.id OR coalesce(g.contexto->>'modo','roteiro')<>_modo OR (_modo<>'roteiro' AND (g.contexto->>'variante_id' IS DISTINCT FROM _variante_id OR g.contexto->>'cena_id' IS DISTINCT FROM _cena_id OR g.contexto->>'estilo' IS DISTINCT FROM _estilo)) THEN RAISE EXCEPTION 'O identificador já pertence a outro pedido' USING ERRCODE='MC409'; END IF;
  RETURN jsonb_build_object('nova',false,'geracao',to_jsonb(g));
 END IF;
 IF _modo<>'roteiro' THEN
  SELECT x INTO v FROM jsonb_array_elements(r.documento->'variantes') x WHERE x->>'id'=_variante_id;
  IF v IS NULL OR coalesce(length(_variante_id),0)>100 THEN RAISE EXCEPTION 'Versão de escrita inválida' USING ERRCODE='22023'; END IF;
  IF _modo='trecho' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v->'cenas') x WHERE x->>'id'=_cena_id) THEN RAISE EXCEPTION 'Secção inválida' USING ERRCODE='22023'; END IF;
  IF _modo='visual' AND (_cena_id IS NOT NULL OR EXISTS(SELECT 1 FROM jsonb_array_elements(v->'cenas') x WHERE btrim(x->>'locucao')='')) THEN RAISE EXCEPTION 'Completa a locução antes de preparar o plano' USING ERRCODE='22023'; END IF;
  c:=jsonb_build_object('modo',_modo,'variante_id',_variante_id,'cena_id',_cena_id,'estilo',_estilo,'variante',v);
 END IF;
 reserva:=public.rv_reservar(_id,_roteiro_id,_revisao);
 IF (reserva->>'nova')::boolean THEN
  UPDATE public.rv_geracoes SET contexto=c WHERE id=_id RETURNING * INTO g;
  reserva:=jsonb_build_object('nova',true,'geracao',to_jsonb(g));
 END IF;
 RETURN reserva;
END $$;
REVOKE ALL ON FUNCTION public.rv_reservar_contexto(uuid,uuid,integer,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rv_reservar_contexto(uuid,uuid,integer,text,text,text,text) TO authenticated;
