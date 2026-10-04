-- E-goi acceptance is not delivery: campaigns go rascunho -> aceite (order accepted) -> enviada (E-goi reports "sent").
ALTER TABLE public.nl_egoi_campanhas DROP CONSTRAINT IF EXISTS nl_egoi_campanhas_estado_check;
ALTER TABLE public.nl_egoi_campanhas ADD CONSTRAINT nl_egoi_campanhas_estado_check CHECK (estado = ANY (ARRAY['rascunho'::text, 'aceite'::text, 'enviada'::text]));
ALTER TABLE public.nl_egoi_campanhas ADD COLUMN IF NOT EXISTS aceite_em timestamptz;
ALTER TABLE public.nl_egoi_campanhas ADD COLUMN IF NOT EXISTS confirmado_em timestamptz;
ALTER TABLE public.nl_egoi_campanhas ADD COLUMN IF NOT EXISTS estado_egoi text;
-- Set when an admin asked to close the send but some accepted campaigns are not yet confirmed;
-- reconciliation closes the edition once every accepted campaign is confirmed.
ALTER TABLE public.nl_edicoes ADD COLUMN IF NOT EXISTS fecho_pendente_em timestamptz;
ALTER TABLE public.nl_edicoes ADD COLUMN IF NOT EXISTS fecho_pendente_por text;