-- Create function to get LinkedIn quota usage
CREATE OR REPLACE FUNCTION public.get_linkedin_quota_usage(p_user_id UUID)
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
    AND platform = 'linkedin'
    AND published_at >= date_trunc('month', CURRENT_DATE);
END;
$$;