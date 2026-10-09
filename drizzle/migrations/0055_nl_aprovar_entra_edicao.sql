CREATE OR REPLACE FUNCTION public.nl_curadoria_decidir(_id uuid, _estado text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE ed uuid; orig uuid;
BEGIN
  IF NOT public.nl_is_staff() THEN RAISE EXCEPTION 'sem acesso' USING ERRCODE='42501'; END IF;
  IF _estado NOT IN ('aprovada','rejeitada','pendente') THEN RAISE EXCEPTION 'decisão inválida' USING ERRCODE='22023'; END IF;
  UPDATE public.nl_noticias SET editorial_estado=_estado, editorial_revisto_em=now()
    WHERE id=_id RETURNING curadoria_origem_id INTO orig;
  IF NOT FOUND THEN RAISE EXCEPTION 'notícia inexistente' USING ERRCODE='P0002'; END IF;
  -- Approval adds the item to the newest draft edition (additive; no-op without a draft).
  IF _estado='aprovada' AND orig IS NULL THEN
    SELECT id INTO ed FROM public.nl_edicoes WHERE estado='rascunho' ORDER BY numero DESC NULLS LAST LIMIT 1;
    IF ed IS NOT NULL THEN PERFORM public.nl_curadoria_para_edicao(_id, ed); END IF;
  END IF;
END $function$;