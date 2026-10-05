-- Source translations (derived PT-PT version of a frozen original). Each paid attempt counts in the project's daily AI budget.
CREATE TABLE public.mc_traducoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  hash_original text NOT NULL CHECK (char_length(hash_original) = 64),
  idioma_origem text NOT NULL CHECK (char_length(idioma_origem) BETWEEN 2 AND 12),
  idioma_destino text NOT NULL DEFAULT 'pt-PT' CHECK (idioma_destino = 'pt-PT'),
  original jsonb NOT NULL,
  resultado jsonb,
  estado text NOT NULL DEFAULT 'reservada' CHECK (estado IN ('reservada','pedido_enviado','valida','invalida','desconhecido','erro_antes_pedido','recusada')),
  tentativas integer NOT NULL DEFAULT 1 CHECK (tentativas BETWEEN 1 AND 2),
  modelo text NOT NULL,
  tokens_entrada integer, tokens_saida integer,
  erro text CHECK (char_length(erro) <= 1000),
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  actualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, hash_original, idioma_destino)
);
-- Every paid attempt (for budget counting, one row per attempt).
CREATE TABLE public.mc_traducoes_tentativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  traducao_id uuid NOT NULL REFERENCES public.mc_traducoes(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mc_traducoes TO authenticated;
GRANT ALL ON public.mc_traducoes TO service_role;
GRANT SELECT ON public.mc_traducoes_tentativas TO authenticated;
GRANT ALL ON public.mc_traducoes_tentativas TO service_role;
ALTER TABLE public.mc_traducoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_traducoes_tentativas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ler traduções do projeto" ON public.mc_traducoes FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));
CREATE POLICY "Ler tentativas de tradução do projeto" ON public.mc_traducoes_tentativas FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));

CREATE OR REPLACE FUNCTION public.mc_uso_dia(_project_id uuid)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (SELECT count(*) FROM public.mc_chamadas_ia WHERE project_id = _project_id AND modelo <> 'simulado-demo'
            AND criado_em >= (date_trunc('day', now() AT TIME ZONE 'Europe/Lisbon') AT TIME ZONE 'Europe/Lisbon'))::int
       + (SELECT count(*) FROM public.mc_traducoes_tentativas WHERE project_id = _project_id
            AND criado_em >= (date_trunc('day', now() AT TIME ZONE 'Europe/Lisbon') AT TIME ZONE 'Europe/Lisbon'))::int
$$;
REVOKE ALL ON FUNCTION public.mc_uso_dia(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mc_uso_dia(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.mc_uso_hoje(_project_id uuid)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN public.mc_pode_ler(_project_id) THEN public.mc_uso_dia(_project_id) ELSE 0 END
$$;

-- Breakdown by action for the UI: generation (1st attempt), repair (later attempts), translation.
CREATE OR REPLACE FUNCTION public.mc_uso_hoje_detalhe(_project_id uuid)
 RETURNS TABLE(geracao integer, reparacao integer, traducao integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH d AS (SELECT (date_trunc('day', now() AT TIME ZONE 'Europe/Lisbon') AT TIME ZONE 'Europe/Lisbon') AS ini)
  SELECT
    (SELECT count(*) FROM public.mc_chamadas_ia c, d WHERE c.project_id = _project_id AND c.modelo <> 'simulado-demo' AND c.tentativa = 1 AND c.criado_em >= d.ini)::int,
    (SELECT count(*) FROM public.mc_chamadas_ia c, d WHERE c.project_id = _project_id AND c.modelo <> 'simulado-demo' AND c.tentativa > 1 AND c.criado_em >= d.ini)::int,
    (SELECT count(*) FROM public.mc_traducoes_tentativas t, d WHERE t.project_id = _project_id AND t.criado_em >= d.ini)::int
  WHERE public.mc_pode_ler(_project_id)
$$;
REVOKE ALL ON FUNCTION public.mc_uso_hoje_detalhe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mc_uso_hoje_detalhe(uuid) TO authenticated, service_role;

-- Generation reservation now counts translations in the same daily budget.
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
    _dia := public.mc_uso_dia(_t.project_id);
    IF _n >= LEAST(_o.max_chamadas_trabalho, 2) OR _dia >= LEAST(_o.max_chamadas_dia, 10) THEN
      RAISE EXCEPTION 'teto de chamadas atingido' USING ERRCODE = 'P0003';
    END IF;
  END IF;
  INSERT INTO public.mc_chamadas_ia (project_id, trabalho_id, cache_chave, tentativa, modelo, custo_incerto)
  VALUES (_t.project_id, _trabalho_id, _t.cache_chave, _n + 1, _t.modelo, _t.modelo <> 'simulado-demo') RETURNING id INTO _id;
  RETURN _id;
END $function$;

-- Translation reservation: one row per (project, hash). Reuse valid; never auto-repeat an unknown outcome;
-- a second paid attempt only after a known invalid result and an explicit request; max 2 attempts.
CREATE OR REPLACE FUNCTION public.mc_reservar_traducao(_project_id uuid, _hash text, _origem text, _original jsonb, _modelo text, _repetir boolean, _utilizador uuid)
 RETURNS TABLE(traducao_id uuid, estado text, reutilizada boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
    IF _r.estado = 'invalida' AND (NOT _repetir OR _r.tentativas >= 2) THEN
      RAISE EXCEPTION 'tradução inválida; repetir exige pedido explícito (máx. 2)' USING ERRCODE = 'P0003';
    END IF;
  END IF;
  SELECT * INTO _o FROM public.mc_orcamentos WHERE project_id = _project_id;
  IF NOT FOUND OR _o.max_chamadas_dia = 0 THEN RAISE EXCEPTION 'orçamento a zero' USING ERRCODE = 'P0002'; END IF;
  IF public.mc_uso_dia(_project_id) >= LEAST(_o.max_chamadas_dia, 10) THEN RAISE EXCEPTION 'teto de chamadas atingido' USING ERRCODE = 'P0003'; END IF;
  IF FOUND AND _r.id IS NOT NULL THEN
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
REVOKE ALL ON FUNCTION public.mc_reservar_traducao(uuid, text, text, jsonb, text, boolean, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mc_reservar_traducao(uuid, text, text, jsonb, text, boolean, uuid) TO service_role;