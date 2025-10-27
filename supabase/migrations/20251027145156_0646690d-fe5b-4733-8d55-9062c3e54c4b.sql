-- Corrigir search_path das funções de quota
CREATE OR REPLACE FUNCTION public.get_instagram_quota_usage(p_user_id UUID)
RETURNS TABLE (
  used_count BIGINT,
  limit_count INTEGER,
  remaining INTEGER
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.can_publish_to_instagram(p_user_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;