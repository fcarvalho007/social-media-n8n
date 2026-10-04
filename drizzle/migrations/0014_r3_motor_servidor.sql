-- R3: server-side steps for the content engine (additive).

-- DocumentoGrafico v1 uses "v" (not "versao").
CREATE OR REPLACE FUNCTION public.mc_validar_documento(_d jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF jsonb_typeof(_d) IS DISTINCT FROM 'object' OR (_d->>'v') IS DISTINCT FROM '1'
     OR (_d->>'largura') IS DISTINCT FROM '1080' OR (_d->>'altura') IS DISTINCT FROM '1350'
     OR (_d->>'variante') NOT IN ('A','B')
     OR jsonb_typeof(_d->'paginas') IS DISTINCT FROM 'array'
     OR jsonb_array_length(_d->'paginas') NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'documento gráfico inválido (v1, 1080x1350, 1-20 páginas)' USING ERRCODE = '22023';
  END IF;
END $$;

ALTER TABLE public.mc_propostas_versoes DROP CONSTRAINT IF EXISTS mc_propostas_versoes_origem_check;
ALTER TABLE public.mc_propostas_versoes ADD CONSTRAINT mc_propostas_versoes_origem_check
  CHECK (origem IN ('ia','humano','importacao','estruturacao','demonstracao'));

-- Budget applies to real models only; the deterministic demo provider costs nothing and
-- is restricted to the synthetic fixture by the worker.
CREATE OR REPLACE FUNCTION public.mc_reservar_chamada(_trabalho_id uuid, _lease uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t public.mc_trabalhos; _o public.mc_orcamentos; _n integer; _dia integer; _custo numeric; _id uuid;
BEGIN
  SELECT * INTO _t FROM public.mc_trabalhos WHERE id = _trabalho_id AND lease_token = _lease AND lease_ate > now() AND estado = 'a_processar' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lease inválido' USING ERRCODE = '40001'; END IF;
  SELECT count(*) INTO _n FROM public.mc_chamadas_ia WHERE trabalho_id = _trabalho_id;
  IF EXISTS (SELECT 1 FROM public.mc_chamadas_ia WHERE cache_chave = _t.cache_chave AND estado = 'desconhecido') THEN
    RAISE EXCEPTION 'chamada anterior em estado desconhecido; não repetir automaticamente' USING ERRCODE = 'P0004';
  END IF;
  IF _t.modelo = 'simulado-demo' THEN
    IF _n >= 1 THEN RAISE EXCEPTION 'teto de chamadas atingido' USING ERRCODE = 'P0003'; END IF;
  ELSE
    SELECT * INTO _o FROM public.mc_orcamentos WHERE project_id = _t.project_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'orçamento não configurado' USING ERRCODE = 'P0002'; END IF;
    PERFORM pg_advisory_xact_lock(hashtext('mc_orcamento:' || _t.project_id::text));
    SELECT count(*), coalesce(sum(custo_eur),0) INTO _dia, _custo FROM public.mc_chamadas_ia
      WHERE project_id = _t.project_id AND modelo <> 'simulado-demo'
        AND criado_em >= (date_trunc('day', now() AT TIME ZONE 'Europe/Lisbon') AT TIME ZONE 'Europe/Lisbon');
    IF _n >= _o.max_chamadas_trabalho OR _dia >= _o.max_chamadas_dia OR _custo >= _o.max_custo_dia_eur THEN
      RAISE EXCEPTION 'teto de chamadas atingido' USING ERRCODE = 'P0003';
    END IF;
  END IF;
  INSERT INTO public.mc_chamadas_ia (project_id, trabalho_id, cache_chave, tentativa, modelo, custo_incerto)
  VALUES (_t.project_id, _trabalho_id, _t.cache_chave, _n + 1, _t.modelo, _t.modelo <> 'simulado-demo') RETURNING id INTO _id;
  RETURN _id;
END $$;

-- Non-AI deterministic structuring (or demo) proposal written by the worker under a valid lease.
CREATE OR REPLACE FUNCTION public.mc_gravar_proposta_servidor(_trabalho_id uuid, _lease uuid, _conteudo jsonb, _origem text, _chamada_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.mc_propostas;
BEGIN
  PERFORM 1 FROM public.mc_trabalhos WHERE id = _trabalho_id AND lease_token = _lease AND lease_ate > now() AND estado = 'a_processar';
  IF NOT FOUND THEN RAISE EXCEPTION 'lease inválido' USING ERRCODE = '40001'; END IF;
  IF _origem NOT IN ('estruturacao','demonstracao','ia') THEN RAISE EXCEPTION 'origem inválida' USING ERRCODE = '22023'; END IF;
  IF _origem IN ('demonstracao','ia') THEN
    PERFORM 1 FROM public.mc_chamadas_ia WHERE id = _chamada_id AND trabalho_id = _trabalho_id AND estado = 'valida';
    IF NOT FOUND THEN RAISE EXCEPTION 'chamada não validada' USING ERRCODE = '22023'; END IF;
  END IF;
  SELECT * INTO _p FROM public.mc_propostas WHERE trabalho_id = _trabalho_id FOR UPDATE;
  IF _p.versao_actual <> 0 THEN RETURN _p.versao_actual; END IF; -- idempotent: never overwrite
  INSERT INTO public.mc_propostas_versoes (proposta_id, versao, conteudo, hash, origem, chamada_id)
  VALUES (_p.id, 1, _conteudo, public.mc_hash(_conteudo), _origem, _chamada_id);
  UPDATE public.mc_propostas SET versao_actual = 1, actualizado_em = now() WHERE id = _p.id;
  RETURN 1;
END $$;

CREATE OR REPLACE FUNCTION public.mc_gravar_documento_servidor(_trabalho_id uuid, _lease uuid, _variante text, _documento jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.mc_propostas; _d public.mc_documentos;
BEGIN
  PERFORM 1 FROM public.mc_trabalhos WHERE id = _trabalho_id AND lease_token = _lease AND lease_ate > now() AND estado = 'a_processar';
  IF NOT FOUND THEN RAISE EXCEPTION 'lease inválido' USING ERRCODE = '40001'; END IF;
  SELECT * INTO _p FROM public.mc_propostas WHERE trabalho_id = _trabalho_id;
  IF _p.versao_actual < 1 THEN RAISE EXCEPTION 'proposta sem versão' USING ERRCODE = '22023'; END IF;
  PERFORM public.mc_validar_documento(_documento);
  INSERT INTO public.mc_documentos (project_id, proposta_id, variante) VALUES (_p.project_id, _p.id, _variante)
  ON CONFLICT (proposta_id, variante) DO NOTHING;
  SELECT * INTO _d FROM public.mc_documentos d WHERE d.proposta_id = _p.id AND d.variante = _variante FOR UPDATE;
  IF _d.versao_actual <> 0 THEN RETURN _d.versao_actual; END IF; -- idempotent
  INSERT INTO public.mc_documentos_versoes (documento_id, versao, proposta_versao, documento, hash)
  VALUES (_d.id, 1, _p.versao_actual, _documento, public.mc_hash(_documento));
  UPDATE public.mc_documentos SET versao_actual = 1, actualizado_em = now() WHERE id = _d.id;
  RETURN 1;
END $$;

-- Atomic client save: optional new editorial version + A/B design versions, all CAS.
-- When the editorial content changes, both variants must be re-linked in the same call.
CREATE OR REPLACE FUNCTION public.mc_gravar_edicao(_proposta_id uuid, _proposta_versao integer, _conteudo jsonb, _documentos jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.mc_propostas; _pv integer; _var text; _item jsonb; _d public.mc_documentos; _res jsonb := '{}'::jsonb;
BEGIN
  SELECT * INTO _p FROM public.mc_propostas WHERE id = _proposta_id FOR UPDATE;
  IF NOT FOUND OR NOT public.mc_pode_escrever(_p.project_id) THEN RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE = '42501'; END IF;
  IF _p.versao_actual <> _proposta_versao THEN
    RAISE EXCEPTION 'conflito de versão (proposta actual %, esperada %)', _p.versao_actual, _proposta_versao USING ERRCODE = '40001';
  END IF;
  IF jsonb_typeof(coalesce(_documentos,'{}'::jsonb)) <> 'object' THEN RAISE EXCEPTION 'documentos inválidos' USING ERRCODE = '22023'; END IF;
  _pv := _p.versao_actual;
  IF _conteudo IS NOT NULL THEN
    IF NOT (_documentos ? 'A' AND _documentos ? 'B') THEN
      RAISE EXCEPTION 'alteração editorial tem de ligar as duas variantes' USING ERRCODE = '22023';
    END IF;
    _pv := _p.versao_actual + 1;
    INSERT INTO public.mc_propostas_versoes (proposta_id, versao, conteudo, hash, origem, criado_por)
    VALUES (_proposta_id, _pv, _conteudo, public.mc_hash(_conteudo), 'humano', auth.uid());
    UPDATE public.mc_propostas SET versao_actual = _pv, aprovada_versao = NULL, aprovada_por = NULL, aprovada_em = NULL, actualizado_em = now() WHERE id = _proposta_id;
  END IF;
  FOR _var, _item IN SELECT * FROM jsonb_each(coalesce(_documentos,'{}'::jsonb)) LOOP
    IF _var NOT IN ('A','B') THEN RAISE EXCEPTION 'variante inválida' USING ERRCODE = '22023'; END IF;
    PERFORM public.mc_validar_documento(_item->'documento');
    IF (_item->'documento'->>'variante') <> _var THEN RAISE EXCEPTION 'variante trocada' USING ERRCODE = '22023'; END IF;
    INSERT INTO public.mc_documentos (project_id, proposta_id, variante) VALUES (_p.project_id, _proposta_id, _var)
    ON CONFLICT (proposta_id, variante) DO NOTHING;
    SELECT * INTO _d FROM public.mc_documentos d WHERE d.proposta_id = _proposta_id AND d.variante = _var FOR UPDATE;
    IF _d.versao_actual <> (_item->>'versao_esperada')::integer THEN
      RAISE EXCEPTION 'conflito de versão (variante % actual %, esperada %)', _var, _d.versao_actual, _item->>'versao_esperada' USING ERRCODE = '40001';
    END IF;
    INSERT INTO public.mc_documentos_versoes (documento_id, versao, proposta_versao, documento, hash, criado_por)
    VALUES (_d.id, _d.versao_actual + 1, _pv, _item->'documento', public.mc_hash(_item->'documento'), auth.uid());
    UPDATE public.mc_documentos SET versao_actual = _d.versao_actual + 1, aprovada_versao = NULL, aprovada_por = NULL, aprovada_em = NULL, actualizado_em = now() WHERE id = _d.id;
    _res := _res || jsonb_build_object(_var, _d.versao_actual + 1);
  END LOOP;
  IF _conteudo IS NOT NULL THEN
    UPDATE public.mc_documentos SET aprovada_versao = NULL, aprovada_por = NULL, aprovada_em = NULL WHERE proposta_id = _proposta_id;
  END IF;
  RETURN jsonb_build_object('proposta_versao', _pv, 'documentos', _res);
END $$;

-- Explicit user retry of a job in "erro" (never for "desconhecido": that needs a new explicit job).
CREATE OR REPLACE FUNCTION public.mc_retomar_trabalho(_trabalho_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t public.mc_trabalhos;
BEGIN
  SELECT * INTO _t FROM public.mc_trabalhos WHERE id = _trabalho_id FOR UPDATE;
  IF NOT FOUND OR NOT public.mc_pode_escrever(_t.project_id) THEN RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE = '42501'; END IF;
  IF _t.estado <> 'erro' THEN RETURN false; END IF;
  UPDATE public.mc_trabalhos SET estado = 'pendente', tentativas = 0, erro = NULL, lease_token = NULL, lease_ate = NULL, actualizado_em = now() WHERE id = _trabalho_id;
  INSERT INTO public.mc_etapas (trabalho_id, etapa, estado, detalhe) VALUES (_trabalho_id, _t.etapa, 'retomado', jsonb_build_object('por', auth.uid()));
  RETURN true;
END $$;

-- Worker uses the same lease owner per run; jobs exhausting attempts become "erro".
CREATE OR REPLACE FUNCTION public.mc_fechar_esgotados()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  UPDATE public.mc_trabalhos SET estado = 'erro', erro = coalesce(erro, 'Interrompido demasiadas vezes.'), lease_token = NULL, lease_ate = NULL, actualizado_em = now()
  WHERE tentativas >= 5 AND (estado = 'pendente' OR (estado = 'a_processar' AND lease_ate < now()));
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;

REVOKE ALL ON FUNCTION public.mc_gravar_proposta_servidor(uuid,uuid,jsonb,text,uuid), public.mc_gravar_documento_servidor(uuid,uuid,text,jsonb),
  public.mc_gravar_edicao(uuid,integer,jsonb,jsonb), public.mc_retomar_trabalho(uuid), public.mc_fechar_esgotados(),
  public.mc_reservar_chamada(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mc_gravar_edicao(uuid,integer,jsonb,jsonb), public.mc_retomar_trabalho(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mc_gravar_proposta_servidor(uuid,uuid,jsonb,text,uuid), public.mc_gravar_documento_servidor(uuid,uuid,text,jsonb),
  public.mc_fechar_esgotados(), public.mc_reservar_chamada(uuid,uuid) TO service_role;