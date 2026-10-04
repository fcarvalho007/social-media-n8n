CREATE OR REPLACE FUNCTION public.nl_pesquisar_arquivo(query text, limite int DEFAULT 20)
RETURNS TABLE(edicao_id uuid, edicao_numero int, edicao_data timestamptz, tipo text, titulo text, trecho text, url text, rank real)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE tsq tsquery; q text;
BEGIN
  IF NOT (public.nl_is_staff() OR public.nl_is_service()) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  q := coalesce(btrim(query), '');
  IF length(q) < 2 THEN RETURN; END IF;
  tsq := plainto_tsquery('portuguese', public.nl_f_unaccent(q));
  IF tsq IS NULL OR tsq::text = '' THEN RETURN; END IF;
  RETURN QUERY
  SELECT e.id, e.numero, e.enviada_em, 'noticia'::text, n.titulo,
    ts_headline('portuguese', public.nl_f_unaccent(coalesce(n.titulo,'') || ' — ' || coalesce(n.descricao,'')), tsq,
      'StartSel=<mark>,StopSel=</mark>,MaxWords=25,MinWords=10,ShortWord=3,MaxFragments=1'),
    n.url, ts_rank(n.busca, tsq)
  FROM public.nl_noticias n JOIN public.nl_edicoes e ON e.id = n.edicao_id
  WHERE e.estado = 'enviada' AND n.busca @@ tsq
  UNION ALL
  SELECT e.id, e.numero, e.enviada_em, 'cronica'::text, coalesce(c.titulo, 'Crónica'),
    ts_headline('portuguese', public.nl_f_unaccent(coalesce(c.titulo,'') || ' — ' || coalesce(c.conteudo,'')), tsq,
      'StartSel=<mark>,StopSel=</mark>,MaxWords=25,MinWords=10,ShortWord=3,MaxFragments=1'),
    NULL::text, ts_rank(c.busca, tsq)
  FROM public.nl_cronicas c JOIN public.nl_edicoes e ON e.id = c.edicao_id
  WHERE e.estado = 'enviada' AND c.busca @@ tsq
  ORDER BY 8 DESC, 2 DESC
  LIMIT greatest(1, coalesce(limite, 20));
END;
$$;

CREATE OR REPLACE FUNCTION public.nl_pesquisar_global(query text, ambitos text[] DEFAULT NULL, edicao_actual uuid DEFAULT NULL, limite integer DEFAULT 40)
RETURNS TABLE(id uuid, ambito text, tipo text, titulo text, trecho text, url text, categoria text, origem text, estado text,
  edicao_id uuid, edicao_numero integer, edicao_data timestamptz, criado_em timestamptz, usada_em_numero integer, rank real)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $function$
DECLARE tsq tsquery; q text; amb text[]; lim integer; ed_actual uuid;
BEGIN
  IF NOT (public.nl_is_staff() OR public.nl_is_service()) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  q := coalesce(btrim(query), '');
  IF length(q) < 2 THEN RETURN; END IF;
  lim := greatest(1, coalesce(limite, 40));
  amb := coalesce(ambitos, ARRAY['edicao_actual','enviadas','pendentes','rejeitadas','ferramentas']);
  tsq := plainto_tsquery('portuguese', public.nl_f_unaccent(q));
  ed_actual := edicao_actual;
  IF ed_actual IS NULL THEN
    SELECT e.id INTO ed_actual FROM public.nl_edicoes e WHERE e.estado = 'rascunho' ORDER BY e.numero DESC LIMIT 1;
  END IF;
  RETURN QUERY
  WITH resultados AS (
    SELECT n.id AS r_id,
      CASE
        WHEN n.edicao_id IS NOT NULL AND n.edicao_id = ed_actual AND n.estado IN ('aprovada','pendente') THEN 'edicao_actual'
        WHEN n.estado = 'enviada' THEN 'enviadas'
        WHEN n.estado = 'rejeitada' THEN 'rejeitadas'
        ELSE 'pendentes'
      END AS r_ambito,
      'noticia'::text AS r_tipo, n.titulo AS r_titulo,
      ts_headline('portuguese', public.nl_f_unaccent(coalesce(n.titulo,'') || ' — ' || coalesce(n.descricao,'')),
        coalesce(tsq, plainto_tsquery('portuguese','x')),
        'StartSel=<mark>,StopSel=</mark>,MaxWords=28,MinWords=10,ShortWord=3,MaxFragments=1') AS r_trecho,
      n.url AS r_url, n.categoria AS r_categoria, n.origem AS r_origem, n.estado AS r_estado, n.edicao_id AS r_edicao_id,
      e.numero AS r_edicao_numero, coalesce(e.enviada_em, e.created_at) AS r_edicao_data, n.created_at AS r_criado_em,
      (SELECT e2.numero FROM public.nl_noticias n2 JOIN public.nl_edicoes e2 ON e2.id = n2.edicao_id
        WHERE n2.id <> n.id AND n2.estado = 'enviada'
          AND ((n.url_norm IS NOT NULL AND n2.url_norm = n.url_norm) OR extensions.similarity(n2.titulo, n.titulo) >= 0.62)
        ORDER BY e2.numero DESC LIMIT 1) AS r_usada,
      greatest(CASE WHEN tsq IS NOT NULL AND n.busca @@ tsq THEN ts_rank(n.busca, tsq) ELSE 0 END,
        extensions.similarity(coalesce(n.titulo,''), q) * 0.9)::real AS r_rank
    FROM public.nl_noticias n LEFT JOIN public.nl_edicoes e ON e.id = n.edicao_id
    WHERE ((tsq IS NOT NULL AND n.busca @@ tsq)
      OR public.nl_f_unaccent(lower(coalesce(n.titulo,''))) LIKE '%' || public.nl_f_unaccent(lower(q)) || '%'
      OR extensions.similarity(coalesce(n.titulo,''), q) >= 0.28)
    UNION ALL
    SELECT c.id, 'enviadas'::text, 'cronica'::text, coalesce(c.titulo, 'Crónica'),
      ts_headline('portuguese', public.nl_f_unaccent(coalesce(c.titulo,'') || ' — ' || coalesce(c.conteudo,'')),
        coalesce(tsq, plainto_tsquery('portuguese','x')),
        'StartSel=<mark>,StopSel=</mark>,MaxWords=28,MinWords=10,ShortWord=3,MaxFragments=1'),
      NULL::text, NULL::text, NULL::text, 'enviada'::text, c.edicao_id, e.numero,
      coalesce(e.enviada_em, e.created_at), e.enviada_em, NULL::integer,
      (CASE WHEN tsq IS NOT NULL AND c.busca @@ tsq THEN ts_rank(c.busca, tsq) ELSE 0 END)::real
    FROM public.nl_cronicas c JOIN public.nl_edicoes e ON e.id = c.edicao_id
    WHERE e.estado = 'enviada' AND tsq IS NOT NULL AND c.busca @@ tsq
    UNION ALL
    SELECT f.id, 'ferramentas'::text, 'ferramenta'::text, f.nome, left(coalesce(f.descricao, ''), 180),
      f.url, f.categoria, NULL::text, f.estado, f.edicao_usada_id, e.numero,
      coalesce(e.enviada_em, e.created_at), f.criado_em, NULL::integer,
      greatest(extensions.similarity(coalesce(f.nome,''), q), extensions.similarity(coalesce(f.descricao,''), q) * 0.5)::real
    FROM public.nl_ferramentas_sugeridas f LEFT JOIN public.nl_edicoes e ON e.id = f.edicao_usada_id
    WHERE public.nl_f_unaccent(lower(coalesce(f.nome,'') || ' ' || coalesce(f.descricao,''))) LIKE '%' || public.nl_f_unaccent(lower(q)) || '%'
       OR extensions.similarity(coalesce(f.nome,''), q) >= 0.3
  )
  SELECT r.r_id, r.r_ambito, r.r_tipo, r.r_titulo, r.r_trecho, r.r_url, r.r_categoria, r.r_origem, r.r_estado,
         r.r_edicao_id, r.r_edicao_numero, r.r_edicao_data, r.r_criado_em, r.r_usada, r.r_rank
  FROM resultados r
  WHERE r.r_ambito = ANY(amb)
  ORDER BY CASE r.r_ambito WHEN 'edicao_actual' THEN 0 WHEN 'pendentes' THEN 1 WHEN 'enviadas' THEN 2 WHEN 'ferramentas' THEN 3 ELSE 4 END,
    r.r_rank DESC, coalesce(r.r_edicao_numero, 0) DESC, r.r_criado_em DESC NULLS LAST
  LIMIT lim;
END;
$function$;

REVOKE ALL ON FUNCTION public.nl_pesquisar_arquivo(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.nl_pesquisar_global(text, text[], uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nl_pesquisar_arquivo(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.nl_pesquisar_global(text, text[], uuid, integer) TO authenticated, service_role;