-- Criar tabela para rastrear quota de publicações
CREATE TABLE IF NOT EXISTS public.publication_quota (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'linkedin')),
  post_type TEXT NOT NULL CHECK (post_type IN ('carousel', 'story', 'post')),
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar índices para performance
CREATE INDEX idx_publication_quota_user_platform ON public.publication_quota(user_id, platform);
CREATE INDEX idx_publication_quota_published_at ON public.publication_quota(published_at);

-- Habilitar RLS
ALTER TABLE public.publication_quota ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own quota"
  ON public.publication_quota
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quota"
  ON public.publication_quota
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Função para verificar quota disponível
CREATE OR REPLACE FUNCTION public.get_instagram_quota_usage(p_user_id UUID)
RETURNS TABLE (
  used_count BIGINT,
  limit_count INTEGER,
  remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as used_count,
    5 as limit_count,
    (5 - COUNT(*)::INTEGER) as remaining
  FROM public.publication_quota
  WHERE user_id = p_user_id
    AND platform = 'instagram'
    AND published_at >= date_trunc('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se pode publicar
CREATE OR REPLACE FUNCTION public.can_publish_to_instagram(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.publication_quota
  WHERE user_id = p_user_id
    AND platform = 'instagram'
    AND published_at >= date_trunc('month', CURRENT_DATE);
  
  RETURN v_count < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;