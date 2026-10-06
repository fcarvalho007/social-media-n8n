ALTER TABLE public.mc_assets DROP CONSTRAINT mc_assets_origem_check;
ALTER TABLE public.mc_assets ADD CONSTRAINT mc_assets_origem_check CHECK (origem = ANY (ARRAY['biblioteca'::text, 'kie'::text, 'upload'::text, 'pexels'::text, 'unsplash'::text, 'giphy'::text]));

CREATE TABLE public.mc_animacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  cover_asset_id uuid NOT NULL UNIQUE REFERENCES public.mc_assets(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider = 'giphy'),
  provider_id text NOT NULL CHECK (char_length(provider_id) BETWEEN 1 AND 100),
  bucket text NOT NULL DEFAULT 'motor-assets' CHECK (bucket = 'motor-assets'),
  storage_path text NOT NULL CHECK (char_length(storage_path) <= 300),
  hash text NOT NULL CHECK (hash ~ '^[0-9a-f]{64}$'),
  mime text NOT NULL DEFAULT 'video/mp4' CHECK (mime = 'video/mp4'),
  largura integer NOT NULL CHECK (largura BETWEEN 1 AND 8000),
  altura integer NOT NULL CHECK (altura BETWEEN 1 AND 8000),
  duracao_ms integer NOT NULL CHECK (duracao_ms BETWEEN 100 AND 60000),
  bytes integer NOT NULL CHECK (bytes BETWEEN 1 AND 52428800),
  credito text NOT NULL DEFAULT 'Powered by GIPHY' CHECK (char_length(credito) <= 200),
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, hash)
);
GRANT SELECT ON public.mc_animacoes TO authenticated;
GRANT ALL ON public.mc_animacoes TO service_role;
ALTER TABLE public.mc_animacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mc_animacoes leitura do projeto" ON public.mc_animacoes FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));
CREATE TRIGGER mc_animacoes_sem_alteracao BEFORE UPDATE ON public.mc_animacoes FOR EACH ROW EXECUTE FUNCTION public.mc_assets_imutavel();