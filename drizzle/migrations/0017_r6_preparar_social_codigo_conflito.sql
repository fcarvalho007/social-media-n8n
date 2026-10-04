CREATE OR REPLACE FUNCTION public.mc_preparar_social(_documento_id uuid, _versao integer, _proposta_versao integer)
RETURNS TABLE (draft_previsto uuid, draft_id uuid, project_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _d public.mc_documentos; _p public.mc_propostas; _pv integer; _novo uuid;
BEGIN
  SELECT * INTO _d FROM public.mc_documentos WHERE id = _documento_id;
  IF NOT FOUND OR NOT public.mc_pode_escrever(_d.project_id) THEN RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE = '42501'; END IF;
  SELECT * INTO _p FROM public.mc_propostas WHERE id = _d.proposta_id FOR UPDATE;
  SELECT * INTO _d FROM public.mc_documentos WHERE id = _documento_id FOR UPDATE;
  SELECT v.proposta_versao INTO _pv FROM public.mc_documentos_versoes v WHERE v.documento_id = _documento_id AND v.versao = _versao;
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
  VALUES (_d.project_id, _documento_id, _versao, 'instagram', _novo, _proposta_versao, auth.uid()),
         (_d.project_id, _documento_id, _versao, 'linkedin', _novo, _proposta_versao, auth.uid())
  ON CONFLICT (documento_id, documento_versao, destino) DO NOTHING;
  RETURN QUERY SELECT l.draft_previsto, l.draft_id, l.project_id FROM public.mc_ligacoes_sociais l
   WHERE l.documento_id = _documento_id AND l.documento_versao = _versao AND l.destino = 'instagram';
END $$;