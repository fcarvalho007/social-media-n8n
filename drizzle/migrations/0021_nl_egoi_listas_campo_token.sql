ALTER TABLE public.nl_egoi_listas ADD COLUMN IF NOT EXISTS campo_token_id integer;
ALTER TABLE public.nl_egoi_listas ADD COLUMN IF NOT EXISTS campo_token_nome text;
DO $$ BEGIN
  ALTER TABLE public.nl_egoi_listas ADD CONSTRAINT nl_egoi_listas_campo_token_id_check CHECK (campo_token_id IS NULL OR campo_token_id > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
COMMENT ON COLUMN public.nl_egoi_listas.campo_token_id IS 'E-goi extra field id (per list, assigned by E-goi) that stores the signed subscription token; NULL = not configured.';