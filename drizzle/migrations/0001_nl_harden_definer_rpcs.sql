CREATE OR REPLACE FUNCTION public.nl_is_service() RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(auth.jwt()->>'role','') = 'service_role'
$$;

CREATE OR REPLACE FUNCTION public.nl_criar_seccoes_padrao(_edicao_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  tipos text[] := ARRAY['destaques','contadores','cronica','consultoria','podcast','categorias','ferramentas_semana','livro','recursos'];
  t text; i int := 1;
BEGIN
  IF NOT (public.nl_is_staff() OR public.nl_is_service()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  FOREACH t IN ARRAY tipos LOOP
    INSERT INTO public.nl_secoes_edicao (edicao_id, tipo, ordem, activo)
    VALUES (_edicao_id, t, i * 10, true)
    ON CONFLICT (edicao_id, tipo) WHERE (tipo <> 'personalizada') DO NOTHING;
    i := i + 1;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.nl_encontrar_candidatos_repeticao(_titulo text, _categoria text, _limiar real DEFAULT 0.30)
 RETURNS TABLE(id uuid, titulo text, edicao_id uuid, edicao_numero integer, created_at timestamp with time zone, score real)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT (public.nl_is_staff() OR public.nl_is_service()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  RETURN QUERY
  SELECT n.id, n.titulo, n.edicao_id, e.numero, n.created_at, similarity(n.titulo, _titulo)
  FROM public.nl_noticias n
  LEFT JOIN public.nl_edicoes e ON e.id = n.edicao_id
  WHERE n.estado IN ('pendente','aprovada','enviada')
    AND n.created_at > now() - interval '8 weeks'
    AND (n.categoria = _categoria OR similarity(n.titulo, _titulo) >= 0.45)
  ORDER BY similarity(n.titulo, _titulo) DESC, n.created_at DESC
  LIMIT 5;
END;
$function$;

CREATE OR REPLACE FUNCTION public.nl_contar_dados_antigos(_dias integer DEFAULT 30)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT (public.nl_is_admin() OR public.nl_is_service()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  RETURN jsonb_build_object(
    'dias', _dias,
    'noticias', (SELECT count(*) FROM public.nl_noticias n WHERE n.edicao_id IS NULL AND n.estado IN ('rejeitada','descartada') AND n.created_at < now() - make_interval(days => _dias)),
    'fila', (SELECT count(*) FROM public.nl_curadoria_fila f WHERE f.estado IN ('processado','falhado','descartado') AND f.created_at < now() - make_interval(days => _dias)),
    'emails', (SELECT count(*) FROM public.nl_emails_recebidos e WHERE e.recebido_em < now() - make_interval(days => _dias)
        AND NOT EXISTS (SELECT 1 FROM public.nl_noticias n WHERE n.email_recebido_id = e.id)
        AND NOT EXISTS (SELECT 1 FROM public.nl_ferramentas_sugeridas fs WHERE fs.fonte_email_id = e.id))
  );
END;
$function$;

-- Manual admin mapping of origin profiles to existing studio accounts (no role changes).
ALTER TABLE public.nl_user_mapping ADD COLUMN IF NOT EXISTS historico jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.nl_mapear_perfil(_source uuid, _target uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.nl_is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF _target IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _target) THEN
    RAISE EXCEPTION 'Conta de destino inexistente';
  END IF;
  UPDATE public.nl_user_mapping
     SET historico = historico || jsonb_build_array(jsonb_build_object(
           'de', target_user_id, 'para', _target, 'por', auth.uid(), 'em', now())),
         target_user_id = _target, updated_at = now()
   WHERE source_user_id = _source;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil de origem não encontrado'; END IF;
END;
$function$;

-- Lock down execution: no anon access to definer RPCs; internal/trigger functions not callable via API.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig, p.prosecdef, p.prorettype = 'trigger'::regtype AS trg, p.proname
           FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname LIKE 'nl\_%' AND p.prokind = 'f' LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    IF r.trg OR r.proname IN ('nl_registar_evento_brief','nl_is_service') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.nl_is_service() TO authenticated;
GRANT EXECUTE ON FUNCTION public.nl_f_unaccent(text) TO anon;
GRANT EXECUTE ON FUNCTION public.nl_normalizar_url_sql(text) TO anon;