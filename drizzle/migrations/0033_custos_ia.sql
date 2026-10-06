CREATE TABLE public.custos_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  fornecedor text NOT NULL CHECK (fornecedor IN ('deepseek','kie','fal','outros')),
  modelo text NOT NULL,
  acao text NOT NULL,
  estado text NOT NULL,
  origem_id text UNIQUE,
  unidades jsonb NOT NULL DEFAULT '{}'::jsonb,
  custo_eur numeric,
  custo_origem text NOT NULL CHECK (custo_origem IN ('confirmado','calculado','estimado','desconhecido')),
  project_id uuid
);
GRANT SELECT ON public.custos_ia TO authenticated;
GRANT ALL ON public.custos_ia TO service_role;
ALTER TABLE public.custos_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY custos_ia_ler ON public.custos_ia FOR SELECT TO authenticated USING (public.nl_is_staff());
COMMENT ON TABLE public.custos_ia IS 'Append-only AI cost ledger for calls not already logged in nl_ia_uso / mc_chamadas_ia / mc_kie_tarefas (written by the service role).';

-- USD->EUR rate used for conversion (fixed, shown in the UI).
CREATE OR REPLACE FUNCTION public.custos_taxa_usd_eur() RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 0.86::numeric $$;

-- DeepSeek tariff (USD per 1M tokens), same table as _shared/nl-app/edge-shared/custos-ia.ts; peak = weekdays 01-04 and 06-10 UTC.
CREATE OR REPLACE FUNCTION public.custos_deepseek_usd(_modelo text, _quando timestamptz, _hit int, _miss int, _saida int)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  WITH m AS (SELECT CASE WHEN lower(_modelo) IN ('deepseek-flash','deepseek-v4-flash','deepseek-v4-flash-vision-exp','deepseek-chat') THEN 'flash'
                         WHEN lower(_modelo) IN ('deepseek-v4-pro','deepseek-pro','deepseek-v4-pro-0813') THEN 'pro' END AS k,
                    (extract(isodow FROM _quando AT TIME ZONE 'UTC') < 6 AND (extract(hour FROM _quando AT TIME ZONE 'UTC') BETWEEN 1 AND 3 OR extract(hour FROM _quando AT TIME ZONE 'UTC') BETWEEN 6 AND 9)) AS pico)
  SELECT CASE WHEN k IS NULL THEN NULL ELSE
    (coalesce(_hit,0) * CASE k WHEN 'flash' THEN 0.006 ELSE 0.044 END
   + coalesce(_miss,0) * CASE k WHEN 'flash' THEN 0.3 ELSE 1.32 END
   + coalesce(_saida,0) * CASE k WHEN 'flash' THEN 1.2 ELSE 3.96 END) / 1e6 * CASE WHEN pico THEN 1 ELSE 0.5 END END
  FROM m $$;

CREATE OR REPLACE FUNCTION public.custos_registos()
RETURNS TABLE (id text, criado_em timestamptz, fornecedor text, modelo text, acao text, estado text, unidades jsonb, custo_eur numeric, custo_origem text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'nl:'||u.id, u.criado_em,
         CASE WHEN u.modelo ILIKE 'deepseek%' THEN 'deepseek' ELSE 'outros' END, u.modelo, coalesce(u.operacao, u.origem, 'newsletter'),
         CASE WHEN u.sucesso THEN 'concluido' ELSE 'falhou' END,
         jsonb_build_object('entrada', coalesce(u.tokens_entrada_cache_hit,0)+coalesce(u.tokens_entrada_cache_miss,0), 'saida', coalesce(u.tokens_saida,0)),
         round(u.custo_usd * custos_taxa_usd_eur(), 6),
         CASE WHEN u.custo_usd IS NULL THEN 'desconhecido' ELSE 'calculado' END
  FROM nl_ia_uso u WHERE nl_is_staff()
  UNION ALL
  SELECT 'mc:'||c.id, c.criado_em,
         CASE WHEN c.modelo ILIKE 'deepseek%' THEN 'deepseek' ELSE 'outros' END, c.modelo, 'carrossel', c.estado,
         jsonb_build_object('entrada', coalesce(c.tokens_entrada,0), 'saida', coalesce(c.tokens_saida,0)),
         round(coalesce(c.custo_eur, custos_deepseek_usd(c.modelo, c.criado_em, 0, c.tokens_entrada, c.tokens_saida) * custos_taxa_usd_eur()), 6),
         CASE WHEN c.custo_eur IS NOT NULL THEN 'calculado' WHEN custos_deepseek_usd(c.modelo, c.criado_em, 0, c.tokens_entrada, c.tokens_saida) IS NOT NULL THEN 'calculado' ELSE 'desconhecido' END
  FROM mc_chamadas_ia c WHERE nl_is_staff() AND c.modelo <> 'simulado-demo'
  UNION ALL
  SELECT 'kie:'||k.id, k.criado_em, CASE WHEN k.modelo LIKE 'fal:%' THEN 'fal' ELSE 'kie' END, k.modelo,
         CASE WHEN k.modelo LIKE '%interpretar' THEN 'ler imagem' ELSE 'gerar imagem' END, k.estado, '{}'::jsonb,
         CASE WHEN k.estado = 'falhou' THEN 0 END,
         CASE WHEN k.estado = 'falhou' THEN 'confirmado' ELSE 'desconhecido' END
  FROM mc_kie_tarefas k WHERE nl_is_staff() AND NOT EXISTS (SELECT 1 FROM custos_ia x WHERE x.origem_id = 'kie:'||k.id)
  UNION ALL
  SELECT 'ci:'||x.id, x.criado_em, x.fornecedor, x.modelo, x.acao, x.estado, x.unidades, x.custo_eur, x.custo_origem
  FROM custos_ia x WHERE nl_is_staff()
  UNION ALL
  SELECT 'log:'||l.id, l.created_at, 'outros', coalesce(l.model,'?'), coalesce(l.feature, l.action_type, 'IA'),
         CASE WHEN l.success THEN 'concluido' ELSE 'falhou' END, jsonb_build_object('tokens', l.tokens_used), NULL, 'desconhecido'
  FROM ai_usage_log l WHERE nl_is_staff()
$$;
REVOKE ALL ON FUNCTION public.custos_registos() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.custos_registos() TO authenticated;