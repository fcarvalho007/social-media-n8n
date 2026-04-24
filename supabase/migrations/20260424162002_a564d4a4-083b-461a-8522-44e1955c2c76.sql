-- Tabela de cache para resolução de menções LinkedIn (URN)
CREATE TABLE IF NOT EXISTS public.linkedin_mention_cache (
  profile_url text PRIMARY KEY,
  urn text NOT NULL,
  mention_format text NOT NULL,
  display_name_hint text,
  resolved_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_linkedin_mention_cache_expires
  ON public.linkedin_mention_cache(expires_at);

-- RLS: leitura para autenticados, escrita só service_role
ALTER TABLE public.linkedin_mention_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mention cache"
  ON public.linkedin_mention_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages mention cache"
  ON public.linkedin_mention_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);