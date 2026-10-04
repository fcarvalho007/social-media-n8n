SET check_function_bodies = false;
CREATE FUNCTION public.nl_brief_edicoes_validar() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions'
    AS $$
BEGIN
  IF NEW.papel NOT IN ('destaque','radar') THEN
    RAISE EXCEPTION 'Papel inválido: %', NEW.papel;
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.nl_briefs_validar() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions'
    AS $$
BEGIN
  IF NEW.tipo NOT IN ('destaque','radar') THEN
    RAISE EXCEPTION 'Tipo de Brief inválido: %', NEW.tipo;
  END IF;
  IF NEW.estado NOT IN ('por_gerar','a_gerar','gerado','por_rever','aprovado','publicado','erro') THEN
    RAISE EXCEPTION 'Estado de Brief inválido: %', NEW.estado;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.slug_congelado AND NEW.slug IS DISTINCT FROM OLD.slug THEN
    RAISE EXCEPTION 'O endereço deste Brief já está congelado';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.nl_contar_dados_antigos(_dias integer DEFAULT 30) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
  SELECT jsonb_build_object(
    'dias', _dias,
    'noticias', (
      SELECT count(*) FROM public.nl_noticias n
      WHERE n.edicao_id IS NULL
        AND n.estado IN ('rejeitada', 'descartada')
        AND n.created_at < now() - make_interval(days => _dias)
    ),
    'fila', (
      SELECT count(*) FROM public.nl_curadoria_fila f
      WHERE f.estado IN ('processado', 'falhado', 'descartado')
        AND f.created_at < now() - make_interval(days => _dias)
    ),
    'emails', (
      SELECT count(*) FROM public.nl_emails_recebidos e
      WHERE e.recebido_em < now() - make_interval(days => _dias)
        AND NOT EXISTS (SELECT 1 FROM public.nl_noticias n WHERE n.email_recebido_id = e.id)
        AND NOT EXISTS (SELECT 1 FROM public.nl_ferramentas_sugeridas fs WHERE fs.fonte_email_id = e.id)
    )
  )
$$;
CREATE FUNCTION public.nl_criar_seccoes_padrao(_edicao_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  tipos text[] := ARRAY['destaques','contadores','cronica','consultoria','podcast','categorias','ferramentas_semana','livro','recursos'];
  t text;
  i int := 1;
BEGIN
  FOREACH t IN ARRAY tipos LOOP
    INSERT INTO public.nl_secoes_edicao (edicao_id, tipo, ordem, activo)
    VALUES (_edicao_id, t, i * 10, true)
    ON CONFLICT (edicao_id, tipo) WHERE (tipo <> 'personalizada') DO NOTHING;
    i := i + 1;
  END LOOP;
END;
$$;
CREATE FUNCTION public.nl_encontrar_candidatos_repeticao(_titulo text, _categoria text, _limiar real DEFAULT 0.30) RETURNS TABLE(id uuid, titulo text, edicao_id uuid, edicao_numero integer, created_at timestamp with time zone, score real)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
  SELECT
    n.id,
    n.titulo,
    n.edicao_id,
    e.numero AS edicao_numero,
    n.created_at,
    similarity(n.titulo, _titulo) AS score
  FROM public.nl_noticias n
  LEFT JOIN public.nl_edicoes e ON e.id = n.edicao_id
  WHERE n.estado IN ('pendente','aprovada','enviada')
    AND n.created_at > now() - interval '8 weeks'
    AND (
      n.categoria = _categoria
      OR similarity(n.titulo, _titulo) >= 0.45
    )
  ORDER BY similarity(n.titulo, _titulo) DESC, n.created_at DESC
  LIMIT 5;
$$;
CREATE FUNCTION public.nl_f_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    SET search_path TO 'public', 'extensions'
    AS $_$ SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1) $_$;
CREATE FUNCTION public.nl_fontes_curadoria_set_grupo() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions'
    AS $$
BEGIN
  IF NEW.grupo IS NULL OR NEW.grupo = '' THEN
    NEW.grupo := COALESCE(
      NULLIF(regexp_replace(COALESCE(NEW.remetente_dominio, ''), '^(mail|email|insight|news|newsletter|link|click|e|go)\.', ''), ''),
      NULLIF(NEW.remetente_dominio, ''),
      NEW.nome
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.nl_is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$ SELECT public.has_role(auth.uid(), 'admin'::public.app_role) $$;
CREATE FUNCTION public.nl_limpar_dados_antigos(_dias integer DEFAULT 30) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  n_noticias integer := 0;
  n_fila integer := 0;
  n_emails integer := 0;
BEGIN
  IF _dias < 7 THEN
    RAISE EXCEPTION 'Retenção mínima de 7 dias';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.nl_is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem limpar dados antigos';
  END IF;
  DELETE FROM public.nl_curadoria_fila f
  WHERE f.estado IN ('processado', 'falhado', 'descartado')
    AND f.created_at < now() - make_interval(days => _dias);
  GET DIAGNOSTICS n_fila = ROW_COUNT;
  DELETE FROM public.nl_noticias n
  WHERE n.edicao_id IS NULL
    AND n.estado IN ('rejeitada', 'descartada')
    AND n.created_at < now() - make_interval(days => _dias);
  GET DIAGNOSTICS n_noticias = ROW_COUNT;
  DELETE FROM public.nl_emails_recebidos e
  WHERE e.recebido_em < now() - make_interval(days => _dias)
    AND NOT EXISTS (SELECT 1 FROM public.nl_noticias n WHERE n.email_recebido_id = e.id)
    AND NOT EXISTS (SELECT 1 FROM public.nl_ferramentas_sugeridas fs WHERE fs.fonte_email_id = e.id);
  GET DIAGNOSTICS n_emails = ROW_COUNT;
  INSERT INTO public.nl_audit_log (quem, accao, detalhe)
  VALUES (coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', 'sistema'),
          'Limpeza de dados antigos',
          jsonb_build_object('dias', _dias, 'noticias', n_noticias, 'fila', n_fila, 'emails', n_emails));
  RETURN jsonb_build_object('dias', _dias, 'noticias', n_noticias, 'fila', n_fila, 'emails', n_emails);
END;
$$;
CREATE FUNCTION public.nl_me_papel() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$ SELECT CASE
      WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN 'admin'
      WHEN public.has_role(auth.uid(), 'editor'::public.app_role) THEN 'curador'
      ELSE NULL END $$;
CREATE FUNCTION public.nl_is_staff() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$ SELECT public.nl_me_papel() IS NOT NULL $$;
CREATE FUNCTION public.nl_mover_seccao(_seccao_id uuid, _direccao text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  _edicao_id uuid;
  _ordem int;
  _estado text;
  _papel text;
  _viz_id uuid;
  _viz_ordem int;
BEGIN
  IF _direccao NOT IN ('cima','baixo') THEN
    RAISE EXCEPTION 'Direcção inválida';
  END IF;
  SELECT edicao_id, ordem INTO _edicao_id, _ordem
    FROM public.nl_secoes_edicao WHERE id = _seccao_id;
  IF _edicao_id IS NULL THEN
    RAISE EXCEPTION 'Secção não encontrada';
  END IF;
  SELECT estado INTO _estado FROM public.nl_edicoes WHERE id = _edicao_id;
  IF _estado IS DISTINCT FROM 'rascunho' THEN
    RAISE EXCEPTION 'Edição não está em rascunho';
  END IF;
  _papel := public.nl_me_papel();
  IF _papel IS NULL OR _papel NOT IN ('admin','curador') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _direccao = 'cima' THEN
    SELECT id, ordem INTO _viz_id, _viz_ordem
      FROM public.nl_secoes_edicao
     WHERE edicao_id = _edicao_id AND ordem < _ordem
     ORDER BY ordem DESC LIMIT 1;
  ELSE
    SELECT id, ordem INTO _viz_id, _viz_ordem
      FROM public.nl_secoes_edicao
     WHERE edicao_id = _edicao_id AND ordem > _ordem
     ORDER BY ordem ASC LIMIT 1;
  END IF;
  IF _viz_id IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.nl_secoes_edicao SET ordem = _viz_ordem WHERE id = _seccao_id;
  UPDATE public.nl_secoes_edicao SET ordem = _ordem     WHERE id = _viz_id;
END;
$$;
CREATE FUNCTION public.nl_normalizar_url_sql(_url text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public', 'extensions'
    AS $_$
DECLARE
  u text;
  esquema text;
  resto text;
  host text;
  caminho text;
  query text;
  partes text[];
  p text;
  chave text;
  mantidos text[] := ARRAY[]::text[];
  rastreio text[] := ARRAY['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id',
                           'fbclid','gclid','mc_cid','mc_eid','ref','ref_src','ref_url','igshid'];
BEGIN
  IF _url IS NULL THEN RETURN NULL; END IF;
  u := lower(btrim(_url));
  IF u = '' THEN RETURN NULL; END IF;
  u := split_part(u, '#', 1);
  IF u ~ '^https?://' THEN
    esquema := split_part(u, '://', 1);
    resto := substring(u from position('://' in u) + 3);
  ELSE
    esquema := 'https';
    resto := u;
  END IF;
  host := split_part(resto, '/', 1);
  host := split_part(host, '?', 1);
  host := regexp_replace(host, '^www\.', '');
  IF position('/' in resto) > 0 THEN
    caminho := '/' || substring(resto from position('/' in resto) + 1);
  ELSE
    caminho := '/';
  END IF;
  query := NULL;
  IF position('?' in caminho) > 0 THEN
    query := substring(caminho from position('?' in caminho) + 1);
    caminho := split_part(caminho, '?', 1);
  END IF;
  caminho := regexp_replace(caminho, '/+$', '');
  IF caminho = '' THEN caminho := '/'; END IF;
  IF query IS NOT NULL AND query <> '' THEN
    partes := string_to_array(query, '&');
    FOREACH p IN ARRAY partes LOOP
      chave := split_part(p, '=', 1);
      IF p <> '' AND NOT (chave = ANY(rastreio)) THEN
        mantidos := array_append(mantidos, p);
      END IF;
    END LOOP;
  END IF;
  IF array_length(mantidos, 1) IS NULL THEN
    RETURN esquema || '://' || host || caminho;
  END IF;
  RETURN esquema || '://' || host || caminho || '?' || array_to_string(mantidos, '&');
END;
$_$;
CREATE FUNCTION public.nl_noticias_set_url_norm() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions'
    AS $$
BEGIN
  NEW.url_norm := public.nl_normalizar_url_sql(NEW.url);
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.nl_registar_evento_brief(_evento text, _slug text, _edicao_numero integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
BEGIN
  IF _evento NOT IN (
    'email_brief_click','edition_brief_click','brief_source_click','brief_related_click','brief_commercial_cta'
  ) THEN
    RETURN;
  END IF;
  INSERT INTO public.nl_brief_eventos (evento, brief_slug, edicao_numero, contagem)
  VALUES (_evento, COALESCE(left(_slug, 200), ''), _edicao_numero, 1)
  ON CONFLICT (evento, brief_slug, dia)
  DO UPDATE SET contagem = public.nl_brief_eventos.contagem + 1, actualizado_em = now();
END;
$$;
CREATE FUNCTION public.nl_reordenar_noticias(_edicao_id uuid, _ids uuid[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  _estado text;
  _papel text;
BEGIN
  SELECT estado INTO _estado FROM public.nl_edicoes WHERE id = _edicao_id;
  IF _estado IS DISTINCT FROM 'rascunho' THEN
    RAISE EXCEPTION 'Edição não está em rascunho';
  END IF;
  _papel := public.nl_me_papel();
  IF _papel IS NULL OR _papel NOT IN ('admin','curador') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  WITH ordenadas AS (
    SELECT n.id,
           row_number() OVER (
             ORDER BY
               COALESCE(array_position(_ids, n.id), 1000000),
               n.ordem,
               n.created_at
           ) AS pos
      FROM public.nl_noticias n
     WHERE n.edicao_id = _edicao_id
  )
  UPDATE public.nl_noticias n
     SET ordem = o.pos * 10
    FROM ordenadas o
   WHERE n.id = o.id
     AND n.ordem IS DISTINCT FROM (o.pos * 10);
END;
$$;
CREATE FUNCTION public.nl_reordenar_seccoes(_edicao_id uuid, _ids uuid[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  _estado text;
  _papel text;
BEGIN
  SELECT estado INTO _estado FROM public.nl_edicoes WHERE id = _edicao_id;
  IF _estado IS DISTINCT FROM 'rascunho' THEN
    RAISE EXCEPTION 'Edição não está em rascunho';
  END IF;
  _papel := public.nl_me_papel();
  IF _papel IS NULL OR _papel NOT IN ('admin','curador') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.nl_secoes_edicao SET ordem = -1000 - ordem WHERE edicao_id = _edicao_id;
  UPDATE public.nl_secoes_edicao s
     SET ordem = t.pos
    FROM (SELECT unnest(_ids) AS id, generate_subscripts(_ids, 1) - 1 AS pos) t
   WHERE s.id = t.id AND s.edicao_id = _edicao_id;
END;
$$;
CREATE FUNCTION public.nl_set_actualizado_em() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions'
    AS $$
BEGIN
  NEW.actualizado_em = now();
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.nl_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.nl_stats_fontes_30d() RETURNS TABLE(fonte_id uuid, sugeridas_30d bigint, aprovadas_30d bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
  SELECT
    n.fonte_id,
    COUNT(*) FILTER (WHERE n.origem = 'curadoria_ia') AS sugeridas_30d,
    COUNT(*) FILTER (WHERE n.estado = 'aprovada')     AS aprovadas_30d
  FROM public.nl_noticias n
  WHERE n.fonte_id IS NOT NULL
    AND n.created_at >= now() - interval '30 days'
  GROUP BY n.fonte_id;
$$;
CREATE FUNCTION public.nl_tg_curadoria_config_updated() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions'
    AS $$
BEGIN
  NEW.actualizado_em = now();
  RETURN NEW;
END;
$$;