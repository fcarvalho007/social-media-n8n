ALTER TABLE public.mc_traducoes ADD COLUMN IF NOT EXISTS resultado_recusado jsonb;
COMMENT ON COLUMN public.mc_traducoes.resultado_recusado IS 'Last rejected translation, kept only for free re-validation; never used as source.';

CREATE OR REPLACE FUNCTION public.mc_reservar_traducao(_project_id uuid, _hash text, _origem text, _original jsonb, _modelo text, _repetir boolean, _utilizador uuid)
 RETURNS TABLE(traducao_id uuid, estado text, reutilizada boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _o public.mc_orcamentos; _r public.mc_traducoes;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('mc_orcamento:' || _project_id::text));
  SELECT * INTO _r FROM public.mc_traducoes WHERE project_id = _project_id AND hash_original = _hash AND idioma_destino = 'pt-PT' FOR UPDATE;
  IF FOUND THEN
    IF _r.estado = 'valida' THEN RETURN QUERY SELECT _r.id, _r.estado, true; RETURN; END IF;
    IF _r.estado IN ('reservada','pedido_enviado','desconhecido') THEN
      RAISE EXCEPTION 'tradução anterior sem resultado conhecido; não repetir automaticamente' USING ERRCODE = 'P0004';
    END IF;
    IF _r.estado = 'invalida' AND _r.tentativas >= 2 THEN
      RAISE EXCEPTION 'tradução inválida já repetida (máx. 2)' USING ERRCODE = 'P0003';
    END IF;
    IF _r.estado = 'invalida' AND NOT _repetir THEN
      RAISE EXCEPTION 'tradução inválida; repetir exige pedido explícito' USING ERRCODE = 'P0006';
    END IF;
  END IF;
  SELECT * INTO _o FROM public.mc_orcamentos WHERE project_id = _project_id;
  IF NOT FOUND OR _o.max_chamadas_dia = 0 THEN RAISE EXCEPTION 'orçamento a zero' USING ERRCODE = 'P0002'; END IF;
  IF public.mc_uso_dia(_project_id) >= LEAST(_o.max_chamadas_dia, 10) THEN RAISE EXCEPTION 'teto de chamadas atingido' USING ERRCODE = 'P0005'; END IF;
  IF _r.id IS NOT NULL THEN
    UPDATE public.mc_traducoes SET estado = 'reservada', erro = NULL, resultado = NULL,
      tentativas = CASE WHEN _r.estado = 'invalida' THEN _r.tentativas + 1 ELSE _r.tentativas END, actualizado_em = now()
      WHERE id = _r.id;
  ELSE
    INSERT INTO public.mc_traducoes(project_id, hash_original, idioma_origem, original, modelo, criado_por)
      VALUES (_project_id, _hash, _origem, _original, _modelo, _utilizador) RETURNING * INTO _r;
  END IF;
  INSERT INTO public.mc_traducoes_tentativas(traducao_id, project_id) VALUES (_r.id, _project_id);
  RETURN QUERY SELECT _r.id, 'reservada'::text, false;
END $function$;