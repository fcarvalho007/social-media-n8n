ALTER TABLE public.mc_assets DROP CONSTRAINT mc_assets_origem_check;
ALTER TABLE public.mc_assets ADD CONSTRAINT mc_assets_origem_check CHECK (origem = ANY (ARRAY['biblioteca'::text, 'kie'::text, 'upload'::text, 'pexels'::text]));
ALTER TABLE public.mc_assets ADD COLUMN IF NOT EXISTS credito text;
ALTER TABLE public.mc_assets ADD COLUMN IF NOT EXISTS origem_url text;
COMMENT ON COLUMN public.mc_assets.credito IS 'Attribution shown to the user (e.g. "Foto: Nome / Pexels"); never printed on the slide.';