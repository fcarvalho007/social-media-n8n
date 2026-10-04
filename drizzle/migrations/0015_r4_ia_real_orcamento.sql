-- R4: real AI for the content engine. Call-count limits only (gateway gives no reliable price).
ALTER TABLE public.mc_chamadas_ia DROP CONSTRAINT mc_chamadas_ia_estado_check;
ALTER TABLE public.mc_chamadas_ia ADD CONSTRAINT mc_chamadas_ia_estado_check CHECK (estado = ANY (ARRAY['reservada','pedido_enviado','resposta_recebida','valida','invalida','desconhecido','erro_antes_pedido','recusada']));

CREATE OR REPLACE FUNCTION public.mc_registar_chamada(_chamada_id uuid, _estado text, _resposta text DEFAULT NULL::text, _tokens_entrada integer DEFAULT NULL::integer, _tokens_saida integer DEFAULT NULL::integer, _custo_eur numeric DEFAULT NULL::numeric, _custo_incerto boolean DEFAULT true, _erro text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _actual text;
BEGIN
  SELECT estado INTO _actual FROM public.mc_chamadas_ia WHERE id = _chamada_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'chamada inexistente' USING ERRCODE = 'P0002'; END IF;
  IF NOT ((_actual = 'reservada' AND _estado IN ('pedido_enviado','erro_antes_pedido'))
       OR (_actual = 'pedido_enviado' AND _estado IN ('resposta_recebida','desconhecido','recusada'))
       OR (_actual = 'resposta_recebida' AND _estado IN ('valida','invalida'))) THEN
    RAISE EXCEPTION 'transição inválida % -> %', _actual, _estado USING ERRCODE = '22023';
  END IF;
  IF _estado = 'resposta_recebida' AND _resposta IS NULL THEN RAISE EXCEPTION 'resposta obrigatória' USING ERRCODE = '22023'; END IF;
  UPDATE public.mc_chamadas_ia SET estado = _estado, resposta_bruta = coalesce(_resposta, resposta_bruta),
    tokens_entrada = coalesce(_tokens_entrada, tokens_entrada), tokens_saida = coalesce(_tokens_saida, tokens_saida),
    custo_eur = coalesce(_custo_eur, custo_eur), custo_incerto = _custo_incerto, erro = _erro, actualizado_em = now()
  WHERE id = _chamada_id;
END $function$;

-- Reservation: atomic per project (advisory lock), per-job cap <= 2, daily cap <= 10, no monetary cap.
CREATE OR REPLACE FUNCTION public.mc_reservar_chamada(_trabalho_id uuid, _lease uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _t public.mc_trabalhos; _o public.mc_orcamentos; _n integer; _dia integer; _id uuid;
BEGIN
  SELECT * INTO _t FROM public.mc_trabalhos WHERE id = _trabalho_id AND lease_token = _lease AND lease_ate > now() AND estado = 'a_processar' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lease inválido' USING ERRCODE = '40001'; END IF;
  SELECT count(*) INTO _n FROM public.mc_chamadas_ia WHERE trabalho_id = _trabalho_id;
  IF EXISTS (SELECT 1 FROM public.mc_chamadas_ia WHERE trabalho_id = _trabalho_id AND estado IN ('desconhecido','pedido_enviado','reservada')) THEN
    RAISE EXCEPTION 'chamada anterior sem resultado conhecido; não repetir automaticamente' USING ERRCODE = 'P0004';
  END IF;
  IF _t.modelo = 'simulado-demo' THEN
    IF _n >= 1 THEN RAISE EXCEPTION 'teto de chamadas atingido' USING ERRCODE = 'P0003'; END IF;
  ELSE
    PERFORM pg_advisory_xact_lock(hashtext('mc_orcamento:' || _t.project_id::text));
    SELECT * INTO _o FROM public.mc_orcamentos WHERE project_id = _t.project_id;
    IF NOT FOUND OR _o.max_chamadas_dia = 0 OR _o.max_chamadas_trabalho = 0 THEN RAISE EXCEPTION 'orçamento a zero' USING ERRCODE = 'P0002'; END IF;
    SELECT count(*) INTO _dia FROM public.mc_chamadas_ia
      WHERE project_id = _t.project_id AND modelo <> 'simulado-demo'
        AND criado_em >= (date_trunc('day', now() AT TIME ZONE 'Europe/Lisbon') AT TIME ZONE 'Europe/Lisbon');
    IF _n >= LEAST(_o.max_chamadas_trabalho, 2) OR _dia >= LEAST(_o.max_chamadas_dia, 10) THEN
      RAISE EXCEPTION 'teto de chamadas atingido' USING ERRCODE = 'P0003';
    END IF;
  END IF;
  INSERT INTO public.mc_chamadas_ia (project_id, trabalho_id, cache_chave, tentativa, modelo, custo_incerto)
  VALUES (_t.project_id, _trabalho_id, _t.cache_chave, _n + 1, _t.modelo, _t.modelo <> 'simulado-demo') RETURNING id INTO _id;
  RETURN _id;
END $function$;
REVOKE ALL ON FUNCTION public.mc_reservar_chamada(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mc_reservar_chamada(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.mc_registar_chamada(uuid, text, text, integer, integer, numeric, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mc_registar_chamada(uuid, text, text, integer, integer, numeric, boolean, text) TO service_role;

-- Owner + editor sets limits for one project (finite: <=10/day, <=2/job).
CREATE OR REPLACE FUNCTION public.mc_definir_orcamento(_project_id uuid, _max_dia integer, _max_trabalho integer)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.mc_pode_escrever(_project_id) THEN RAISE EXCEPTION 'sem acesso' USING ERRCODE = '42501'; END IF;
  IF _max_dia IS NULL OR _max_dia < 0 OR _max_dia > 10 THEN RAISE EXCEPTION 'limite diário entre 0 e 10' USING ERRCODE = '22023'; END IF;
  IF _max_trabalho IS NULL OR _max_trabalho < 1 OR _max_trabalho > 2 THEN RAISE EXCEPTION 'limite por trabalho entre 1 e 2' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.mc_orcamentos (project_id, max_chamadas_dia, max_chamadas_trabalho, max_custo_dia_eur, actualizado_em)
  VALUES (_project_id, _max_dia, _max_trabalho, 0, now())
  ON CONFLICT (project_id) DO UPDATE SET max_chamadas_dia = EXCLUDED.max_chamadas_dia, max_chamadas_trabalho = EXCLUDED.max_chamadas_trabalho, actualizado_em = now();
END $function$;
REVOKE ALL ON FUNCTION public.mc_definir_orcamento(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mc_definir_orcamento(uuid, integer, integer) TO authenticated, service_role;
COMMENT ON COLUMN public.mc_orcamentos.max_custo_dia_eur IS 'DEPRECATED: not enforced since R4 (gateway gives no reliable price); limits are call counts.';

-- Usage read for the UI (today, Lisbon) — owner only via mc_pode_ler.
CREATE OR REPLACE FUNCTION public.mc_uso_hoje(_project_id uuid)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN public.mc_pode_ler(_project_id) THEN (SELECT count(*)::int FROM public.mc_chamadas_ia
    WHERE project_id = _project_id AND modelo <> 'simulado-demo'
      AND criado_em >= (date_trunc('day', now() AT TIME ZONE 'Europe/Lisbon') AT TIME ZONE 'Europe/Lisbon')) ELSE 0 END
$function$;
REVOKE ALL ON FUNCTION public.mc_uso_hoje(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mc_uso_hoje(uuid) TO authenticated, service_role;