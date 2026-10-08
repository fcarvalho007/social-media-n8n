-- Slides with an animated sticker are also exported as MP4 (recorded in the browser,
-- uploaded through mc-motor and registered like any other immutable export file).
ALTER TABLE public.mc_exportacoes DROP CONSTRAINT mc_exportacoes_formato_check;
ALTER TABLE public.mc_exportacoes ADD CONSTRAINT mc_exportacoes_formato_check CHECK (formato IN ('png','pdf','zip','mp4'));
