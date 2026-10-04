-- Durable progress of the E-goi subscription-token sync, per list + extra field.
CREATE TABLE public.nl_egoi_tokens_sync (
  egoi_lista_id text NOT NULL,
  campo_id integer NOT NULL CHECK (campo_id > 0),
  estado text NOT NULL DEFAULT 'por_iniciar' CHECK (estado IN ('por_iniciar','em_curso','concluida','campo_invalido')),
  campo_validado boolean NOT NULL DEFAULT false,
  campo_meta jsonb,
  segredo_fp text NOT NULL,
  offset_proximo integer NOT NULL DEFAULT 0 CHECK (offset_proximo >= 0),
  processados integer NOT NULL DEFAULT 0,
  actualizados integer NOT NULL DEFAULT 0,
  ja_correctos integer NOT NULL DEFAULT 0,
  ignorados integer NOT NULL DEFAULT 0,
  total_egoi integer,
  verificado_leitura boolean NOT NULL DEFAULT false,
  ultimo_erro text,
  lease_token uuid,
  lease_ate timestamptz,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  actualizado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz,
  PRIMARY KEY (egoi_lista_id, campo_id)
);
GRANT SELECT ON public.nl_egoi_tokens_sync TO authenticated;
GRANT ALL ON public.nl_egoi_tokens_sync TO service_role;
ALTER TABLE public.nl_egoi_tokens_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins leem progresso tokens" ON public.nl_egoi_tokens_sync FOR SELECT TO authenticated USING (public.nl_is_admin());

CREATE TABLE public.nl_egoi_tokens_falhas (
  egoi_lista_id text NOT NULL,
  campo_id integer NOT NULL,
  contact_id text NOT NULL,
  motivo text NOT NULL,
  tentativas integer NOT NULL DEFAULT 1,
  resolvida boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  actualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (egoi_lista_id, campo_id, contact_id)
);
GRANT SELECT ON public.nl_egoi_tokens_falhas TO authenticated;
GRANT ALL ON public.nl_egoi_tokens_falhas TO service_role;
ALTER TABLE public.nl_egoi_tokens_falhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins leem falhas tokens" ON public.nl_egoi_tokens_falhas FOR SELECT TO authenticated USING (public.nl_is_admin());
CREATE INDEX nl_egoi_tokens_falhas_pendentes ON public.nl_egoi_tokens_falhas (egoi_lista_id, campo_id) WHERE NOT resolvida;