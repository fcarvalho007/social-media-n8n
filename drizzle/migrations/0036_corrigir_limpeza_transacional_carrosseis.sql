CREATE OR REPLACE FUNCTION public.mc_eliminar_trabalhos(_trabalho_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ids uuid[];
  _fonte_ids uuid[];
  _documento_ids uuid[];
  _proposta_ids uuid[];
  _eliminados integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária.' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(array_agg(t.id), ARRAY[]::uuid[]),
         coalesce(array_agg(DISTINCT t.fonte_id), ARRAY[]::uuid[])
    INTO _ids, _fonte_ids
  FROM public.mc_trabalhos t
  WHERE t.id = ANY(coalesce(_trabalho_ids, ARRAY[]::uuid[]))
    AND public.mc_pode_escrever(t.project_id);

  IF cardinality(_ids) <> cardinality(ARRAY(SELECT DISTINCT unnest(coalesce(_trabalho_ids, ARRAY[]::uuid[])))) THEN
    RAISE EXCEPTION 'Um ou mais carrosséis não existem ou não podem ser eliminados.' USING ERRCODE = '42501';
  END IF;

  IF cardinality(_ids) = 0 THEN
    RETURN 0;
  END IF;

  PERFORM set_config('mc.permitir_limpeza', 'on', true);

  SELECT coalesce(array_agg(p.id), ARRAY[]::uuid[])
    INTO _proposta_ids
  FROM public.mc_propostas p
  WHERE p.trabalho_id = ANY(_ids);

  SELECT coalesce(array_agg(d.id), ARRAY[]::uuid[])
    INTO _documento_ids
  FROM public.mc_documentos d
  WHERE d.proposta_id = ANY(_proposta_ids);

  DELETE FROM public.mc_ligacoes_sociais WHERE documento_id = ANY(_documento_ids);
  DELETE FROM public.mc_export_trabalhos WHERE documento_id = ANY(_documento_ids);
  DELETE FROM public.mc_exportacoes WHERE documento_id = ANY(_documento_ids);
  DELETE FROM public.mc_documentos_versoes WHERE documento_id = ANY(_documento_ids);
  DELETE FROM public.mc_documentos WHERE id = ANY(_documento_ids);
  DELETE FROM public.mc_propostas_versoes WHERE proposta_id = ANY(_proposta_ids);
  DELETE FROM public.mc_propostas WHERE id = ANY(_proposta_ids);
  DELETE FROM public.mc_sistemas_visuais WHERE trabalho_id = ANY(_ids);
  DELETE FROM public.mc_composicao_paginas WHERE trabalho_id = ANY(_ids);
  DELETE FROM public.mc_etapas WHERE trabalho_id = ANY(_ids);
  UPDATE public.mc_chamadas_ia SET trabalho_id = NULL WHERE trabalho_id = ANY(_ids);
  DELETE FROM public.mc_trabalhos WHERE id = ANY(_ids);
  GET DIAGNOSTICS _eliminados = ROW_COUNT;

  DELETE FROM public.mc_fontes f
  WHERE f.id = ANY(_fonte_ids)
    AND NOT EXISTS (SELECT 1 FROM public.mc_trabalhos t WHERE t.fonte_id = f.id);

  RETURN _eliminados;
END;
$$;