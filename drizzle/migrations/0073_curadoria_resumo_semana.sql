CREATE OR REPLACE FUNCTION public.nl_curadoria_resumo_semana()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE _inicio timestamptz := date_trunc('week', now() AT TIME ZONE 'Europe/Lisbon') AT TIME ZONE 'Europe/Lisbon'; r jsonb;
BEGIN
  IF NOT public.nl_is_staff() THEN RAISE EXCEPTION 'sem acesso' USING ERRCODE='42501'; END IF;
  WITH a AS (SELECT categoria, estado FROM public.nl_noticias
    WHERE curadoria_origem_id IS NULL AND editorial_estado='aprovada' AND editorial_revisto_em >= _inicio)
  SELECT jsonb_build_object('inicio', _inicio, 'total', (SELECT count(*) FROM a),
    'enviadas', (SELECT count(*) FROM a WHERE estado='enviada'),
    'por_enviar', (SELECT count(*) FROM a WHERE estado IS DISTINCT FROM 'enviada'),
    'por_categoria', coalesce((SELECT jsonb_object_agg(categoria, n) FROM (SELECT coalesce(categoria,'Outra') categoria, count(*) n FROM a GROUP BY 1) c), '{}'::jsonb))
  INTO r;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.nl_curadoria_resumo_semana() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nl_curadoria_resumo_semana() TO authenticated;