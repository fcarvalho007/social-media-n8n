-- Same staff-only table and service-role writes. No grants or RLS changes.
ALTER TABLE public.nl_conteudos_derivados
  ADD COLUMN IF NOT EXISTS divulgacao jsonb CHECK (divulgacao IS NULL OR jsonb_typeof(divulgacao) = 'object'),
  ADD COLUMN IF NOT EXISTS divulgacao_versao integer NOT NULL DEFAULT 0 CHECK (divulgacao_versao >= 0);
COMMENT ON COLUMN public.nl_conteudos_derivados.divulgacao IS 'Editable Story launch draft, built without AI from the immutable source; never a publication or schedule.';
