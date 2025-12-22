-- Criar bucket público para imagens IA geradas
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-generated-images', 'ai-generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- Permitir upload pelo utilizador autenticado
CREATE POLICY "Users can upload their AI images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ai-generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Permitir leitura pelo utilizador autenticado
CREATE POLICY "Users can view their AI images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ai-generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Permitir delete pelo utilizador autenticado
CREATE POLICY "Users can delete their AI images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ai-generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Acesso público para visualização (para URLs públicos)
CREATE POLICY "Public can view AI images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ai-generated-images');

-- Adicionar coluna source à media_library se não existir
ALTER TABLE public.media_library 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload';

-- Adicionar coluna para prompt da IA (útil para histórico)
ALTER TABLE public.media_library 
ADD COLUMN IF NOT EXISTS ai_prompt TEXT;