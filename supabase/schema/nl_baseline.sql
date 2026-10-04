-- Newsletter (nl_*) + Estudio baseline, regenerated from the live Cloud catalog (read-only export, no reset).
-- Objects created by drizzle 0004 (estudio_*, nl_conteudos_*) are excluded on purpose.
-- Recovers DDL whose original migrations were lost in a fallback sync. Idempotent: safe on the live DB.
-- Clean checkout order: social migrations (supabase/migrations) -> this file -> drizzle/migrations (0000..).
-- Do not edit by hand: regenerate with scripts/exportar-esquema-nl.sql via `lovable supabase query`.
SET check_function_bodies = off;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.nl_brief_edicoes_validar()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.papel NOT IN ('destaque','radar') THEN
    RAISE EXCEPTION 'Papel inválido: %', NEW.papel;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.nl_briefs_validar()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.nl_contar_dados_antigos(_dias integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
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
$function$
;

CREATE OR REPLACE FUNCTION public.nl_criar_seccoes_padrao(_edicao_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
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
$function$
;

CREATE OR REPLACE FUNCTION public.nl_encontrar_candidatos_repeticao(_titulo text, _categoria text, _limiar real DEFAULT 0.30)
 RETURNS TABLE(id uuid, titulo text, edicao_id uuid, edicao_numero integer, created_at timestamp with time zone, score real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
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
$function$
;

CREATE OR REPLACE FUNCTION public.nl_f_unaccent(text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
 SET search_path TO 'public', 'extensions'
AS $function$ SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1) $function$
;

CREATE OR REPLACE FUNCTION public.nl_fontes_curadoria_set_grupo()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.nl_import_existentes(_tabela text, _pk text, _ids text[])
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_out text[];
BEGIN
  IF NOT public.nl_is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF _tabela NOT LIKE 'nl\_%' OR _tabela IN ('nl_import_runs','nl_user_mapping') THEN RAISE EXCEPTION 'Tabela não permitida'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_tabela AND column_name=_pk) THEN
    RAISE EXCEPTION 'Coluna inválida';
  END IF;
  EXECUTE format('SELECT coalesce(array_agg(%I::text), ARRAY[]::text[]) FROM public.%I WHERE %I::text = ANY($1)', _pk, _tabela, _pk)
    INTO v_out USING _ids;
  RETURN v_out;
END $function$
;

CREATE OR REPLACE FUNCTION public.nl_import_reescrever_url(_antigo text, _novo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_n int;
BEGIN
  IF NOT public.nl_is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF _antigo IS NULL OR length(_antigo) < 10 THEN RAISE EXCEPTION 'URL antiga inválida'; END IF;
  ALTER TABLE public.nl_revista_edicao DISABLE TRIGGER nl_revista_edicao_updated_at;
  UPDATE public.nl_revista_edicao SET cronica_imagem_url = replace(cronica_imagem_url, _antigo, _novo)
   WHERE position(_antigo in cronica_imagem_url) > 0;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  ALTER TABLE public.nl_revista_edicao ENABLE TRIGGER nl_revista_edicao_updated_at;
  RETURN jsonb_build_object('actualizadas', v_n);
END $function$
;

CREATE OR REPLACE FUNCTION public.nl_import_relatorio()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE r record; v_cont jsonb := '{}'::jsonb; v_orf jsonb := '[]'::jsonb; v_n bigint;
BEGIN
  IF NOT public.nl_is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  FOR r IN SELECT c.relname FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind='r'
           AND c.relname LIKE 'nl\_%' AND c.relname NOT IN ('nl_import_runs','nl_user_mapping') ORDER BY 1 LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', r.relname) INTO v_n;
    v_cont := v_cont || jsonb_build_object(r.relname, v_n);
  END LOOP;
  FOR r IN
    SELECT c.conrelid::regclass::text AS filha, a.attname AS coluna, c.confrelid::regclass::text AS mae, fa.attname AS ref
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    JOIN pg_attribute fa ON fa.attrelid = c.confrelid AND fa.attnum = c.confkey[1]
    WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace AND c.conrelid::regclass::text LIKE 'nl\_%'
  LOOP
    EXECUTE format('SELECT count(*) FROM %s x WHERE x.%I IS NOT NULL AND NOT EXISTS (SELECT 1 FROM %s y WHERE y.%I = x.%I)',
      r.filha, r.coluna, r.mae, r.ref, r.coluna) INTO v_n;
    v_orf := v_orf || jsonb_build_array(jsonb_build_object('relacao', r.filha||'.'||r.coluna||' → '||r.mae, 'orfaos', v_n));
  END LOOP;
  RETURN jsonb_build_object('contagens', v_cont, 'relacoes', v_orf);
END $function$
;

CREATE OR REPLACE FUNCTION public.nl_import_repeticoes(_pares jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_n int;
BEGIN
  IF NOT public.nl_is_admin() THEN RAISE EXCEPTION 'Apenas administradores podem importar'; END IF;
  ALTER TABLE public.nl_noticias DISABLE TRIGGER nl_trg_noticias_updated_at;
  UPDATE public.nl_noticias n SET repeticao_de = (p->>'repeticao_de')::uuid
  FROM jsonb_array_elements(_pares) p
  WHERE n.id = (p->>'id')::uuid
    AND n.repeticao_de IS DISTINCT FROM (p->>'repeticao_de')::uuid
    AND EXISTS (SELECT 1 FROM public.nl_noticias o WHERE o.id = (p->>'repeticao_de')::uuid);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  ALTER TABLE public.nl_noticias ENABLE TRIGGER nl_trg_noticias_updated_at;
  RETURN jsonb_build_object('actualizadas', v_n);
END $function$
;

CREATE OR REPLACE FUNCTION public.nl_import_rows(_tabela text, _linhas jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cols text; v_total int; v_ins int;
  v_permitidas text[] := ARRAY['nl_configuracoes','nl_curadoria_config','nl_curadoria_ferramentas_config',
    'nl_definicoes_ia','nl_prioridades_editoriais','nl_fontes_curadoria','nl_egoi_listas','nl_episodios_podcast',
    'nl_emails_recebidos','nl_edicoes','nl_secoes_edicao','nl_noticias','nl_cronicas','nl_ferramentas_semana',
    'nl_ferramentas_excluidas','nl_ferramentas_sugeridas','nl_revista_edicao','nl_revista_itens','nl_briefs',
    'nl_brief_versoes','nl_brief_edicoes','nl_brief_eventos','nl_egoi_campanhas','nl_curadoria_fila','nl_ia_uso',
    'nl_subscricao_eventos','nl_audit_log'];
BEGIN
  IF NOT public.nl_is_admin() THEN RAISE EXCEPTION 'Apenas administradores podem importar'; END IF;
  IF NOT (_tabela = ANY (v_permitidas)) THEN RAISE EXCEPTION 'Tabela não permitida: %', _tabela; END IF;
  IF jsonb_typeof(_linhas) <> 'array' THEN RAISE EXCEPTION 'Formato inválido'; END IF;
  v_total := jsonb_array_length(_linhas);
  IF v_total = 0 THEN RETURN jsonb_build_object('total', 0, 'inseridos', 0, 'existentes', 0); END IF;
  IF v_total > 2000 THEN RAISE EXCEPTION 'Lote demasiado grande (máx. 2000)'; END IF;
  SELECT string_agg(quote_ident(c.column_name), ',' ORDER BY c.ordinal_position) INTO v_cols
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = _tabela AND c.is_generated = 'NEVER'
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(_linhas) e WHERE e ? c.column_name);
  IF v_cols IS NULL THEN RAISE EXCEPTION 'Nenhuma coluna reconhecida para %', _tabela; END IF;
  EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER USER', _tabela);
  EXECUTE format(
    'WITH ins AS (INSERT INTO public.%I (%s) OVERRIDING SYSTEM VALUE SELECT %s FROM jsonb_populate_recordset(NULL::public.%I, $1) ON CONFLICT DO NOTHING RETURNING 1) SELECT count(*) FROM ins',
    _tabela, v_cols, v_cols, _tabela) INTO v_ins USING _linhas;
  EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER USER', _tabela);
  IF _tabela = 'nl_audit_log' THEN
    PERFORM setval('public.nl_audit_log_id_seq', GREATEST((SELECT max(id) FROM public.nl_audit_log), 1));
  END IF;
  RETURN jsonb_build_object('total', v_total, 'inseridos', v_ins, 'existentes', v_total - v_ins);
END $function$
;

CREATE OR REPLACE FUNCTION public.nl_import_suspender_agendamentos()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_n int;
BEGIN
  IF NOT public.nl_is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  UPDATE public.nl_edicoes
     SET agendamento_erro = 'Suspenso na migração (era ' || agendamento_estado || ')',
         agendamento_estado = 'nenhum'
   WHERE agendamento_estado IN ('agendado', 'a_executar');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('suspensas', v_n);
END $function$
;

CREATE OR REPLACE FUNCTION public.nl_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$ SELECT public.has_role(auth.uid(), 'admin'::public.app_role) $function$
;

CREATE OR REPLACE FUNCTION public.nl_is_service()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(auth.jwt()->>'role','') = 'service_role'
$function$
;

CREATE OR REPLACE FUNCTION public.nl_is_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$ SELECT public.nl_me_papel() IS NOT NULL $function$
;

CREATE OR REPLACE FUNCTION public.nl_limpar_dados_antigos(_dias integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.nl_mapear_perfil(_source uuid, _target uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;

CREATE OR REPLACE FUNCTION public.nl_me_papel()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$ SELECT CASE
      WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN 'admin'
      WHEN public.has_role(auth.uid(), 'editor'::public.app_role) THEN 'curador'
      ELSE NULL END $function$
;

CREATE OR REPLACE FUNCTION public.nl_mover_seccao(_seccao_id uuid, _direccao text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.nl_normalizar_url_sql(_url text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.nl_noticias_set_url_norm()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  NEW.url_norm := public.nl_normalizar_url_sql(NEW.url);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.nl_pesquisar_arquivo(query text, limite integer DEFAULT 20)
 RETURNS TABLE(edicao_id uuid, edicao_numero integer, edicao_data timestamp with time zone, tipo text, titulo text, trecho text, url text, rank real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.nl_pesquisar_global(query text, ambitos text[] DEFAULT NULL::text[], edicao_actual uuid DEFAULT NULL::uuid, limite integer DEFAULT 40)
 RETURNS TABLE(id uuid, ambito text, tipo text, titulo text, trecho text, url text, categoria text, origem text, estado text, edicao_id uuid, edicao_numero integer, edicao_data timestamp with time zone, criado_em timestamp with time zone, usada_em_numero integer, rank real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
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
$function$
;

CREATE OR REPLACE FUNCTION public.nl_registar_evento_brief(_evento text, _slug text, _edicao_numero integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.nl_reordenar_noticias(_edicao_id uuid, _ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.nl_reordenar_seccoes(_edicao_id uuid, _ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.nl_set_actualizado_em()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  NEW.actualizado_em = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.nl_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.nl_stats_fontes_30d()
 RETURNS TABLE(fonte_id uuid, sugeridas_30d bigint, aprovadas_30d bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT
    n.fonte_id,
    COUNT(*) FILTER (WHERE n.origem = 'curadoria_ia') AS sugeridas_30d,
    COUNT(*) FILTER (WHERE n.estado = 'aprovada')     AS aprovadas_30d
  FROM public.nl_noticias n
  WHERE n.fonte_id IS NOT NULL
    AND n.created_at >= now() - interval '30 days'
  GROUP BY n.fonte_id;
$function$
;

CREATE OR REPLACE FUNCTION public.nl_tg_curadoria_config_updated()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  NEW.actualizado_em = now();
  RETURN NEW;
END;
$function$
;

CREATE TABLE IF NOT EXISTS public.art_rascunhos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid,
  titulo text DEFAULT ''::text NOT NULL,
  resumo text,
  corpo text DEFAULT ''::text NOT NULL,
  estado text DEFAULT 'rascunho'::text NOT NULL,
  created_by uuid DEFAULT auth.uid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  quem text,
  accao text NOT NULL,
  detalhe jsonb,
  criado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_brief_edicoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  brief_id uuid NOT NULL,
  edicao_id uuid NOT NULL,
  papel text DEFAULT 'destaque'::text NOT NULL,
  ordem integer DEFAULT 0 NOT NULL,
  titulo_apresentado text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_brief_eventos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  evento text NOT NULL,
  brief_slug text DEFAULT ''::text NOT NULL,
  edicao_numero integer,
  dia date DEFAULT ((now() AT TIME ZONE 'Europe/Lisbon'::text))::date NOT NULL,
  contagem integer DEFAULT 0 NOT NULL,
  actualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_brief_versoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  brief_id uuid NOT NULL,
  versao integer NOT NULL,
  conteudo jsonb DEFAULT '{}'::jsonb NOT NULL,
  hash text NOT NULL,
  motivo text,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  criado_por text
);

CREATE TABLE IF NOT EXISTS public.nl_briefs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  noticia_id uuid,
  fingerprint text NOT NULL,
  slug text NOT NULL,
  slug_congelado boolean DEFAULT false NOT NULL,
  tipo text DEFAULT 'destaque'::text NOT NULL,
  estado text DEFAULT 'por_gerar'::text NOT NULL,
  indexavel boolean DEFAULT false NOT NULL,
  em_30_segundos jsonb DEFAULT '[]'::jsonb NOT NULL,
  porque_interessa jsonb DEFAULT '[]'::jsonb NOT NULL,
  leitura_sugerida text DEFAULT ''::text NOT NULL,
  leitura_aprovada text DEFAULT ''::text NOT NULL,
  aprovada_em timestamp with time zone,
  aprovada_por text,
  fonte_url text,
  fonte_url_norm text,
  fonte_publisher text,
  fonte_data date,
  fonte_primaria_url text,
  fontes_adicionais jsonb DEFAULT '[]'::jsonb NOT NULL,
  verificacao jsonb DEFAULT '{}'::jsonb NOT NULL,
  ia jsonb DEFAULT '{}'::jsonb NOT NULL,
  hash_publicado text,
  publicado_em timestamp with time zone,
  erro text,
  tentativas integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  factos jsonb DEFAULT '[]'::jsonb NOT NULL,
  contexto jsonb DEFAULT '[]'::jsonb NOT NULL,
  incertezas jsonb DEFAULT '[]'::jsonb NOT NULL,
  pull_quote_sugerida text DEFAULT ''::text NOT NULL,
  titulo_editorial text DEFAULT ''::text NOT NULL,
  tese_editorial text DEFAULT ''::text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_configuracoes (
  chave text NOT NULL,
  valor text,
  actualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_cronicas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  edicao_id uuid NOT NULL,
  conteudo text,
  leituras_recomendadas text,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  conteudo_html text,
  titulo text,
  concluida boolean DEFAULT false NOT NULL,
  busca tsvector GENERATED ALWAYS AS (to_tsvector('portuguese'::regconfig, nl_f_unaccent(((COALESCE(titulo, ''::text) || ' '::text) || COALESCE(conteudo, ''::text))))) STORED
);

CREATE TABLE IF NOT EXISTS public.nl_curadoria_config (
  id smallint DEFAULT 1 NOT NULL,
  max_insercoes_por_corrida integer DEFAULT 15 NOT NULL,
  janela_horas integer DEFAULT 24 NOT NULL,
  actualizado_em timestamp with time zone DEFAULT now() NOT NULL,
  max_por_email integer DEFAULT 4 NOT NULL,
  max_por_dia integer DEFAULT 25 NOT NULL,
  max_por_fonte integer DEFAULT 2 NOT NULL,
  max_por_categoria integer DEFAULT 3 NOT NULL,
  max_por_dia_email integer DEFAULT 15 NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_curadoria_ferramentas_config (
  id smallint DEFAULT 1 NOT NULL,
  dia_semana integer DEFAULT 1 NOT NULL,
  hora integer DEFAULT 9 NOT NULL,
  max_por_corrida integer DEFAULT 10 NOT NULL,
  activo boolean DEFAULT true NOT NULL,
  actualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_curadoria_fila (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  origem text DEFAULT 'rss'::text NOT NULL,
  fonte_id uuid,
  fonte_nome text,
  fonte_grupo text,
  email_recebido_id uuid,
  titulo text NOT NULL,
  url text,
  url_norm text,
  descricao text DEFAULT ''::text NOT NULL,
  publicado_em timestamp with time zone DEFAULT now() NOT NULL,
  estado text DEFAULT 'em_fila'::text NOT NULL,
  motivo text,
  tentativas integer DEFAULT 0 NOT NULL,
  noticia_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_definicoes_ia (
  id text DEFAULT 'default'::text NOT NULL,
  provider text DEFAULT 'lovable'::text NOT NULL,
  modelo text DEFAULT 'google/gemini-2.5-flash'::text NOT NULL,
  estado text DEFAULT 'configurada'::text NOT NULL,
  ultimo_teste_em timestamp with time zone,
  ultimo_erro text,
  actualizado_por uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_edicoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  numero integer NOT NULL,
  data_envio_prevista date,
  assunto text,
  estado text DEFAULT 'rascunho'::text NOT NULL,
  episodio_podcast_id uuid,
  bloco_livro boolean DEFAULT true NOT NULL,
  bloco_recursos boolean DEFAULT true NOT NULL,
  snapshot_envio jsonb,
  enviada_em timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  wordpress_post_id bigint,
  wordpress_post_url text,
  links_verificados jsonb,
  links_verificados_em timestamp with time zone,
  bloco_consultoria jsonb DEFAULT jsonb_build_object('titulo', 'Isto aplica-se à tua empresa?', 'subtitulo', 'Se este tema tocou nalguma decisão que estás a adiar, marca 15 minutos comigo. Digo-te já se vale a pena aprofundar.', 'texto_botao', 'Marcar 15 minutos', 'url_botao', 'https://digitalfc.pt/agendar') NOT NULL,
  descricoes_ajustadas_em timestamp with time zone,
  links_ignorados jsonb DEFAULT '[]'::jsonb NOT NULL,
  categorias_ocultas_email jsonb DEFAULT '[]'::jsonb NOT NULL,
  agendado_para timestamp with time zone,
  agendamento_estado text DEFAULT 'nenhum'::text NOT NULL,
  agendamento_listas jsonb DEFAULT '[]'::jsonb NOT NULL,
  agendamento_wordpress boolean DEFAULT true NOT NULL,
  agendamento_erro text,
  agendado_por text,
  agendamento_iniciado_em timestamp with time zone,
  envio_em_curso timestamp with time zone,
  template_version text DEFAULT 'revista'::text NOT NULL,
  revista_snapshot jsonb,
  destinos jsonb DEFAULT '{}'::jsonb NOT NULL,
  fecho_pendente_em timestamp with time zone,
  fecho_pendente_por text
);

CREATE TABLE IF NOT EXISTS public.nl_egoi_campanhas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  edicao_id uuid NOT NULL,
  lista_id uuid NOT NULL,
  campaign_hash text NOT NULL,
  estado text DEFAULT 'rascunho'::text NOT NULL,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  actualizado_em timestamp with time zone DEFAULT now() NOT NULL,
  aceite_em timestamp with time zone,
  confirmado_em timestamp with time zone,
  estado_egoi text
);

CREATE TABLE IF NOT EXISTS public.nl_egoi_listas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text NOT NULL,
  egoi_lista_id text NOT NULL,
  tipo text DEFAULT 'real'::text NOT NULL,
  activa boolean DEFAULT true NOT NULL,
  ordem integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_emails_recebidos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  remetente text,
  remetente_nome text,
  assunto text,
  corpo_html text,
  corpo_texto text,
  classificacao text,
  notas_processadas integer DEFAULT 0 NOT NULL,
  recebido_em timestamp with time zone DEFAULT now() NOT NULL,
  message_id text,
  corpo_hash text,
  classificacao_detalhe jsonb DEFAULT '{}'::jsonb NOT NULL,
  processamento_estado text DEFAULT 'por_processar'::text NOT NULL,
  processamento_erro text,
  processamento_tentativas integer DEFAULT 0 NOT NULL,
  processado_em timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.nl_episodios_podcast (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  titulo text NOT NULL,
  codigo text,
  data_publicacao date,
  url text,
  criado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_ferramentas_excluidas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome_norm text,
  dominio text,
  motivo text,
  criado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_ferramentas_semana (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  edicao_id uuid NOT NULL,
  posicao integer NOT NULL,
  nome text,
  descricao text,
  url text,
  emoji text,
  cor text DEFAULT 'indigo'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  etiqueta text DEFAULT ''::text NOT NULL,
  cta_rotulo text DEFAULT ''::text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_ferramentas_sugeridas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text NOT NULL,
  url text NOT NULL,
  descricao text,
  categoria text,
  fonte_email_id uuid,
  remetente text,
  assunto_origem text,
  estado text DEFAULT 'pendente'::text NOT NULL,
  aprovada_em timestamp with time zone,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  emoji text,
  cor text DEFAULT 'indigo'::text NOT NULL,
  descricao_original text,
  fonte_directorio_id uuid,
  edicao_usada_id uuid,
  edicao_aprovada_id uuid
);

CREATE TABLE IF NOT EXISTS public.nl_fontes_curadoria (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text NOT NULL,
  url_feed text NOT NULL,
  activa boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  ultima_recolha timestamp with time zone,
  criada_em timestamp with time zone DEFAULT now() NOT NULL,
  tipo text DEFAULT 'rss'::text NOT NULL,
  url_listagem text,
  remetente_email text,
  remetente_dominio text,
  foca_ferramentas boolean DEFAULT false NOT NULL,
  zeros_consecutivos integer DEFAULT 0 NOT NULL,
  grupo text
);

CREATE TABLE IF NOT EXISTS public.nl_ia_uso (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  modelo text NOT NULL,
  tokens_entrada_cache_hit integer DEFAULT 0 NOT NULL,
  tokens_entrada_cache_miss integer DEFAULT 0 NOT NULL,
  tokens_saida integer DEFAULT 0 NOT NULL,
  custo_usd numeric(10,6) DEFAULT 0 NOT NULL,
  origem text NOT NULL,
  edicao_id uuid,
  brief_id uuid,
  operacao text,
  duracao_ms integer,
  sucesso boolean DEFAULT true NOT NULL,
  erro text
);

CREATE TABLE IF NOT EXISTS public.nl_import_runs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  created_by uuid DEFAULT auth.uid() NOT NULL,
  modo text NOT NULL,
  estado text DEFAULT 'em_curso'::text NOT NULL,
  ficheiro_sha256 text NOT NULL,
  staging_path text,
  manifesto jsonb DEFAULT '{}'::jsonb NOT NULL,
  progresso jsonb DEFAULT '{}'::jsonb NOT NULL,
  relatorio jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  concluido_em timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.nl_noticias (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  edicao_id uuid,
  titulo text NOT NULL,
  descricao text,
  url text,
  categoria text NOT NULL,
  origem text NOT NULL,
  estado text DEFAULT 'pendente'::text NOT NULL,
  destino text DEFAULT 'news'::text NOT NULL,
  destaque boolean DEFAULT false NOT NULL,
  ordem integer DEFAULT 0 NOT NULL,
  url_curto text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  fonte_id uuid,
  busca tsvector GENERATED ALWAYS AS (to_tsvector('portuguese'::regconfig, nl_f_unaccent(((COALESCE(titulo, ''::text) || ' '::text) || COALESCE(descricao, ''::text))))) STORED,
  email_remetente text,
  email_assunto text,
  repeticao_de uuid,
  repeticao_score real,
  repeticao_verificada_em timestamp with time zone,
  embedding extensions.halfvec(3072),
  email_recebido_id uuid,
  override_destino text DEFAULT 'auto'::text NOT NULL,
  url_norm text,
  fonte_estado text DEFAULT 'ok'::text NOT NULL,
  fonte_url_original text,
  corpo_artigo text
);

CREATE TABLE IF NOT EXISTS public.nl_prioridades_editoriais (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  palavra_chave text NOT NULL,
  peso integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_revista_edicao (
  edicao_id uuid NOT NULL,
  preheader text DEFAULT ''::text NOT NULL,
  cronica_titulo text DEFAULT ''::text NOT NULL,
  cronica_subtitulo text DEFAULT ''::text NOT NULL,
  cronica_lede text DEFAULT ''::text NOT NULL,
  cronica_excerto text DEFAULT ''::text NOT NULL,
  cronica_url text DEFAULT ''::text NOT NULL,
  momento_activo boolean DEFAULT false NOT NULL,
  momento_etiqueta text DEFAULT 'O número da semana'::text NOT NULL,
  momento_valor text DEFAULT ''::text NOT NULL,
  momento_descricao text DEFAULT ''::text NOT NULL,
  pull_quote text DEFAULT ''::text NOT NULL,
  recomendacao_tipo text DEFAULT ''::text NOT NULL,
  recomendacao_meta text DEFAULT ''::text NOT NULL,
  recomendacao_titulo text DEFAULT ''::text NOT NULL,
  recomendacao_url text DEFAULT ''::text NOT NULL,
  recomendacao_nota text DEFAULT ''::text NOT NULL,
  bloco_ferramentas boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  podcast_activo boolean DEFAULT false NOT NULL,
  podcast_etiqueta text DEFAULT 'Podcast semanal'::text NOT NULL,
  podcast_programa text DEFAULT ''::text NOT NULL,
  podcast_tema text DEFAULT ''::text NOT NULL,
  podcast_convidado text DEFAULT ''::text NOT NULL,
  podcast_pergunta text DEFAULT ''::text NOT NULL,
  podcast_url text DEFAULT ''::text NOT NULL,
  podcast_cta text DEFAULT 'Ouvir o episódio'::text NOT NULL,
  livro_activo boolean DEFAULT false NOT NULL,
  livro_etiqueta text DEFAULT 'Para aprofundar · Livro'::text NOT NULL,
  livro_titulo text DEFAULT ''::text NOT NULL,
  livro_texto text DEFAULT ''::text NOT NULL,
  livro_cta text DEFAULT 'Conhecer o livro'::text NOT NULL,
  livro_url text DEFAULT ''::text NOT NULL,
  servicos_activo boolean DEFAULT false NOT NULL,
  servicos_titulo text DEFAULT 'Como te posso ajudar'::text NOT NULL,
  servicos_intro text DEFAULT ''::text NOT NULL,
  servicos_cta text DEFAULT 'Pedir uma auditoria digital'::text NOT NULL,
  servicos_url text DEFAULT ''::text NOT NULL,
  servicos_consultoria_texto text DEFAULT ''::text NOT NULL,
  servicos_consultoria_cta text DEFAULT 'Conhecer a consultoria'::text NOT NULL,
  servicos_consultoria_url text DEFAULT ''::text NOT NULL,
  servicos_cursos_texto text DEFAULT ''::text NOT NULL,
  servicos_cursos_cta text DEFAULT 'Explorar cursos e formação'::text NOT NULL,
  servicos_cursos_url text DEFAULT ''::text NOT NULL,
  momento_posicao smallint DEFAULT 99 NOT NULL,
  pull_quote_posicao smallint DEFAULT 99 NOT NULL,
  cronica_imagem_url text DEFAULT ''::text NOT NULL,
  cronica_imagem_alt text DEFAULT ''::text NOT NULL,
  cronica_imagem_credito text DEFAULT ''::text NOT NULL,
  cronica_imagem_credito_url text DEFAULT ''::text NOT NULL,
  cronica_imagem_fonte text DEFAULT ''::text NOT NULL,
  cronica_imagem_posicao integer DEFAULT '-1'::integer NOT NULL,
  cronica_lede_posicao integer DEFAULT 0 NOT NULL,
  recomendacao_activa boolean DEFAULT true NOT NULL,
  promocao_activa boolean DEFAULT true NOT NULL,
  promocao_prefixo text DEFAULT 'Novo curso'::text NOT NULL,
  promocao_link_texto text DEFAULT 'Curso de inteligência artificial'::text NOT NULL,
  promocao_url text DEFAULT 'https://fredericocarvalho.pt/curso-de-inteligencia-artificial/'::text NOT NULL,
  cronica_imagem_recorte_url text DEFAULT ''::text NOT NULL,
  cronica_imagem_enquadramento jsonb DEFAULT '{}'::jsonb NOT NULL,
  servicos_cursos_activo boolean DEFAULT true NOT NULL,
  servicos_consultoria_activo boolean DEFAULT true NOT NULL,
  servicos_auditoria_activo boolean DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_revista_itens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  edicao_id uuid NOT NULL,
  noticia_id uuid NOT NULL,
  papel text NOT NULL,
  ordem integer DEFAULT 0 NOT NULL,
  titulo_override text,
  resumo_factual text DEFAULT ''::text NOT NULL,
  minha_leitura text DEFAULT ''::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  cta_rotulo text DEFAULT ''::text NOT NULL,
  radar_nota text DEFAULT ''::text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_secoes_edicao (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  edicao_id uuid NOT NULL,
  tipo text NOT NULL,
  ordem integer DEFAULT 0 NOT NULL,
  activo boolean DEFAULT true NOT NULL,
  titulo text,
  texto text,
  cor text,
  texto_botao text,
  url_botao text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_subscricao_eventos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  lista_egoi_id text,
  lista_nome text,
  accao text NOT NULL,
  motivo text,
  retoma_em timestamp with time zone,
  retomado_em timestamp with time zone,
  origem text DEFAULT 'email'::text NOT NULL,
  edicao_id uuid,
  detalhe jsonb DEFAULT '{}'::jsonb NOT NULL,
  criado_em timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nl_user_mapping (
  source_user_id uuid NOT NULL,
  source_nome text,
  source_email text,
  source_papel text,
  target_user_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  historico jsonb DEFAULT '[]'::jsonb NOT NULL
);

DO $$ BEGIN ALTER TABLE public.art_rascunhos ADD CONSTRAINT art_rascunhos_estado_check CHECK ((estado = ANY (ARRAY['rascunho'::text, 'revisao'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.art_rascunhos ADD CONSTRAINT art_rascunhos_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_audit_log ADD CONSTRAINT nl_audit_log_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_brief_edicoes ADD CONSTRAINT nl_brief_edicoes_brief_id_edicao_id_key UNIQUE (brief_id, edicao_id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_brief_edicoes ADD CONSTRAINT nl_brief_edicoes_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_brief_eventos ADD CONSTRAINT nl_brief_eventos_evento_check CHECK ((evento = ANY (ARRAY['email_brief_click'::text, 'brief_open_from_email'::text, 'edition_brief_click'::text, 'brief_source_click'::text, 'brief_related_click'::text, 'brief_commercial_cta'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_brief_eventos ADD CONSTRAINT nl_brief_eventos_evento_valido CHECK ((evento = ANY (ARRAY['email_brief_click'::text, 'edition_brief_click'::text, 'brief_source_click'::text, 'brief_related_click'::text, 'brief_commercial_cta'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_brief_eventos ADD CONSTRAINT nl_brief_eventos_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_brief_eventos ADD CONSTRAINT nl_brief_eventos_unico UNIQUE (evento, brief_slug, dia); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_brief_versoes ADD CONSTRAINT nl_brief_versoes_brief_id_versao_key UNIQUE (brief_id, versao); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_brief_versoes ADD CONSTRAINT nl_brief_versoes_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_briefs ADD CONSTRAINT nl_briefs_fingerprint_key UNIQUE (fingerprint); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_briefs ADD CONSTRAINT nl_briefs_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_briefs ADD CONSTRAINT nl_briefs_slug_key UNIQUE (slug); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_configuracoes ADD CONSTRAINT nl_configuracoes_pkey PRIMARY KEY (chave); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_cronicas ADD CONSTRAINT nl_cronicas_edicao_id_key UNIQUE (edicao_id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_cronicas ADD CONSTRAINT nl_cronicas_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_curadoria_config ADD CONSTRAINT nl_curadoria_config_id_check CHECK ((id = 1)); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_curadoria_config ADD CONSTRAINT nl_curadoria_config_janela_horas_check CHECK (((janela_horas >= 1) AND (janela_horas <= 168))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_curadoria_config ADD CONSTRAINT nl_curadoria_config_max_insercoes_por_corrida_check CHECK (((max_insercoes_por_corrida >= 1) AND (max_insercoes_por_corrida <= 100))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_curadoria_config ADD CONSTRAINT nl_curadoria_config_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_curadoria_ferramentas_config ADD CONSTRAINT nl_curadoria_ferramentas_config_dia_semana_check CHECK (((dia_semana >= 0) AND (dia_semana <= 6))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_curadoria_ferramentas_config ADD CONSTRAINT nl_curadoria_ferramentas_config_hora_check CHECK (((hora >= 0) AND (hora <= 23))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_curadoria_ferramentas_config ADD CONSTRAINT nl_curadoria_ferramentas_config_id_check CHECK ((id = 1)); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_curadoria_ferramentas_config ADD CONSTRAINT nl_curadoria_ferramentas_config_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_curadoria_ferramentas_config ADD CONSTRAINT nl_curadoria_ferramentas_config_max_por_corrida_check CHECK (((max_por_corrida >= 1) AND (max_por_corrida <= 50))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_curadoria_fila ADD CONSTRAINT nl_curadoria_fila_estado_chk CHECK ((estado = ANY (ARRAY['em_fila'::text, 'processado'::text, 'falhado'::text, 'descartado'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_curadoria_fila ADD CONSTRAINT nl_curadoria_fila_origem_chk CHECK ((origem = ANY (ARRAY['rss'::text, 'email'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_curadoria_fila ADD CONSTRAINT nl_curadoria_fila_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_definicoes_ia ADD CONSTRAINT nl_definicoes_ia_estado_check CHECK ((estado = ANY (ARRAY['nao_configurada'::text, 'configurada'::text, 'erro'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_definicoes_ia ADD CONSTRAINT nl_definicoes_ia_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_definicoes_ia ADD CONSTRAINT nl_definicoes_ia_provider_check CHECK ((provider = ANY (ARRAY['lovable'::text, 'deepseek'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_definicoes_ia ADD CONSTRAINT nl_definicoes_ia_singleton CHECK ((id = 'default'::text)); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_edicoes ADD CONSTRAINT nl_edicoes_agendamento_estado_chk CHECK ((agendamento_estado = ANY (ARRAY['nenhum'::text, 'agendado'::text, 'a_executar'::text, 'executado'::text, 'falhou'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_edicoes ADD CONSTRAINT nl_edicoes_estado_check CHECK ((estado = ANY (ARRAY['rascunho'::text, 'enviada'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_edicoes ADD CONSTRAINT nl_edicoes_numero_key UNIQUE (numero); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_edicoes ADD CONSTRAINT nl_edicoes_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_edicoes ADD CONSTRAINT nl_edicoes_template_version_chk CHECK ((template_version = ANY (ARRAY['classic'::text, 'revista'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_egoi_campanhas ADD CONSTRAINT nl_egoi_campanhas_edicao_id_lista_id_key UNIQUE (edicao_id, lista_id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_egoi_campanhas ADD CONSTRAINT nl_egoi_campanhas_estado_check CHECK ((estado = ANY (ARRAY['rascunho'::text, 'aceite'::text, 'enviada'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_egoi_campanhas ADD CONSTRAINT nl_egoi_campanhas_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_egoi_listas ADD CONSTRAINT nl_egoi_listas_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_egoi_listas ADD CONSTRAINT nl_egoi_listas_tipo_check CHECK ((tipo = ANY (ARRAY['teste'::text, 'real'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_emails_recebidos ADD CONSTRAINT nl_emails_recebidos_classificacao_check CHECK ((classificacao = ANY (ARRAY['confirmacao'::text, 'newsletter'::text, 'outro'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_emails_recebidos ADD CONSTRAINT nl_emails_recebidos_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_episodios_podcast ADD CONSTRAINT nl_episodios_podcast_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ferramentas_excluidas ADD CONSTRAINT nl_ferramentas_excluidas_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ferramentas_semana ADD CONSTRAINT nl_ferramentas_semana_cor_check CHECK ((cor = ANY (ARRAY['indigo'::text, 'verde'::text, 'laranja'::text, 'cinzento'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ferramentas_semana ADD CONSTRAINT nl_ferramentas_semana_edicao_id_posicao_key UNIQUE (edicao_id, posicao); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ferramentas_semana ADD CONSTRAINT nl_ferramentas_semana_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ferramentas_semana ADD CONSTRAINT nl_ferramentas_semana_posicao_check CHECK ((posicao = ANY (ARRAY[1, 2]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ferramentas_sugeridas ADD CONSTRAINT nl_ferramentas_sugeridas_cor_check CHECK ((cor = ANY (ARRAY['indigo'::text, 'verde'::text, 'laranja'::text, 'cinzento'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ferramentas_sugeridas ADD CONSTRAINT nl_ferramentas_sugeridas_estado_check CHECK ((estado = ANY (ARRAY['pendente'::text, 'aprovada'::text, 'rejeitada'::text, 'arquivada'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ferramentas_sugeridas ADD CONSTRAINT nl_ferramentas_sugeridas_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_fontes_curadoria ADD CONSTRAINT nl_fontes_curadoria_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_fontes_curadoria ADD CONSTRAINT nl_fontes_curadoria_tipo_check CHECK ((tipo = ANY (ARRAY['rss'::text, 'html'::text, 'newsletter'::text, 'directorio_ferramentas'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ia_uso ADD CONSTRAINT nl_ia_uso_origem_check CHECK ((origem = ANY (ARRAY['colagem_manual'::text, 'curadoria_rss'::text, 'sugerir_assunto'::text, 'encurtar_descricao'::text, 'pesquisar_fonte'::text, 'embedding_deteccao_repeticao'::text, 'confirmar_repeticao'::text, 'curadoria_fila'::text, 'extraccao_noticia'::text, 'descricao_reescrita'::text, 'minha_leitura'::text, 'email'::text, 'email_newsletter'::text, 'manual_ia'::text, 'sugestao_organizacao'::text, 'preparar_consulta_fonte'::text, 'curadoria_ferramentas_relevancia'::text, 'curadoria_ferramentas_polimento'::text, 'brief'::text, 'apresentacao_cronica'::text, 'pecas_cronica'::text, 'carrossel_cronica'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ia_uso ADD CONSTRAINT nl_ia_uso_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_import_runs ADD CONSTRAINT nl_import_runs_estado_check CHECK ((estado = ANY (ARRAY['em_curso'::text, 'concluida'::text, 'falhada'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_import_runs ADD CONSTRAINT nl_import_runs_modo_check CHECK ((modo = ANY (ARRAY['dry_run'::text, 'importacao'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_import_runs ADD CONSTRAINT nl_import_runs_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_noticias ADD CONSTRAINT nl_noticias_categoria_check CHECK ((categoria = ANY (ARRAY['ia'::text, 'google'::text, 'youtube'::text, 'meta'::text, 'linkedin'::text, 'tiktok'::text, 'x'::text, 'media'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_noticias ADD CONSTRAINT nl_noticias_destino_check CHECK ((destino = ANY (ARRAY['news'::text, 'site'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_noticias ADD CONSTRAINT nl_noticias_estado_check CHECK ((estado = ANY (ARRAY['pendente'::text, 'aprovada'::text, 'rejeitada'::text, 'enviada'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_noticias ADD CONSTRAINT nl_noticias_origem_check CHECK ((origem = ANY (ARRAY['form_unica'::text, 'form_bloco'::text, 'whatsapp'::text, 'curadoria_ia'::text, 'manual'::text, 'manual_ia'::text, 'email_newsletter'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_noticias ADD CONSTRAINT nl_noticias_override_destino_check CHECK ((override_destino = ANY (ARRAY['auto'::text, 'email'::text, 'site'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_noticias ADD CONSTRAINT nl_noticias_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_prioridades_editoriais ADD CONSTRAINT nl_palavra_chave_minusculas CHECK ((palavra_chave = lower(palavra_chave))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_prioridades_editoriais ADD CONSTRAINT nl_palavra_chave_nao_vazia CHECK ((length(btrim(palavra_chave)) > 0)); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_prioridades_editoriais ADD CONSTRAINT nl_prioridades_editoriais_palavra_chave_key UNIQUE (palavra_chave); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_prioridades_editoriais ADD CONSTRAINT nl_prioridades_editoriais_peso_check CHECK (((peso >= '-5'::integer) AND (peso <= 5))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_prioridades_editoriais ADD CONSTRAINT nl_prioridades_editoriais_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_revista_edicao ADD CONSTRAINT nl_revista_edicao_pkey PRIMARY KEY (edicao_id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_revista_itens ADD CONSTRAINT nl_revista_itens_edicao_id_noticia_id_key UNIQUE (edicao_id, noticia_id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_revista_itens ADD CONSTRAINT nl_revista_itens_papel_check CHECK ((papel = ANY (ARRAY['destaque'::text, 'radar'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_revista_itens ADD CONSTRAINT nl_revista_itens_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_secoes_edicao ADD CONSTRAINT nl_secoes_edicao_cor_check CHECK ((cor = ANY (ARRAY['indigo'::text, 'verde'::text, 'laranja'::text, 'cinzento'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_secoes_edicao ADD CONSTRAINT nl_secoes_edicao_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_secoes_edicao ADD CONSTRAINT nl_secoes_edicao_tipo_check CHECK ((tipo = ANY (ARRAY['destaques'::text, 'contadores'::text, 'cronica'::text, 'consultoria'::text, 'podcast'::text, 'categorias'::text, 'ferramentas_semana'::text, 'livro'::text, 'recursos'::text, 'personalizada'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_subscricao_eventos ADD CONSTRAINT nl_subscricao_eventos_accao_check CHECK ((accao = ANY (ARRAY['cancelado'::text, 'pausado'::text, 'mensal'::text, 'reactivado'::text, 'revertido'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_subscricao_eventos ADD CONSTRAINT nl_subscricao_eventos_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_user_mapping ADD CONSTRAINT nl_user_mapping_pkey PRIMARY KEY (source_user_id); EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.art_rascunhos ADD CONSTRAINT art_rascunhos_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_brief_edicoes ADD CONSTRAINT nl_brief_edicoes_brief_id_fkey FOREIGN KEY (brief_id) REFERENCES nl_briefs(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_brief_edicoes ADD CONSTRAINT nl_brief_edicoes_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES nl_edicoes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_brief_versoes ADD CONSTRAINT nl_brief_versoes_brief_id_fkey FOREIGN KEY (brief_id) REFERENCES nl_briefs(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_briefs ADD CONSTRAINT nl_briefs_noticia_id_fkey FOREIGN KEY (noticia_id) REFERENCES nl_noticias(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_cronicas ADD CONSTRAINT nl_cronicas_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES nl_edicoes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_curadoria_fila ADD CONSTRAINT nl_curadoria_fila_email_recebido_id_fkey FOREIGN KEY (email_recebido_id) REFERENCES nl_emails_recebidos(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_curadoria_fila ADD CONSTRAINT nl_curadoria_fila_fonte_id_fkey FOREIGN KEY (fonte_id) REFERENCES nl_fontes_curadoria(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_curadoria_fila ADD CONSTRAINT nl_curadoria_fila_noticia_id_fkey FOREIGN KEY (noticia_id) REFERENCES nl_noticias(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_edicoes ADD CONSTRAINT nl_edicoes_episodio_podcast_id_fkey FOREIGN KEY (episodio_podcast_id) REFERENCES nl_episodios_podcast(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_egoi_campanhas ADD CONSTRAINT nl_egoi_campanhas_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES nl_edicoes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_egoi_campanhas ADD CONSTRAINT nl_egoi_campanhas_lista_id_fkey FOREIGN KEY (lista_id) REFERENCES nl_egoi_listas(id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ferramentas_semana ADD CONSTRAINT nl_ferramentas_semana_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES nl_edicoes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ferramentas_sugeridas ADD CONSTRAINT nl_ferramentas_sugeridas_edicao_aprovada_id_fkey FOREIGN KEY (edicao_aprovada_id) REFERENCES nl_edicoes(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ferramentas_sugeridas ADD CONSTRAINT nl_ferramentas_sugeridas_edicao_usada_id_fkey FOREIGN KEY (edicao_usada_id) REFERENCES nl_edicoes(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ferramentas_sugeridas ADD CONSTRAINT nl_ferramentas_sugeridas_fonte_directorio_id_fkey FOREIGN KEY (fonte_directorio_id) REFERENCES nl_fontes_curadoria(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ferramentas_sugeridas ADD CONSTRAINT nl_ferramentas_sugeridas_fonte_email_id_fkey FOREIGN KEY (fonte_email_id) REFERENCES nl_emails_recebidos(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ia_uso ADD CONSTRAINT nl_ia_uso_brief_id_fkey FOREIGN KEY (brief_id) REFERENCES nl_briefs(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_ia_uso ADD CONSTRAINT nl_ia_uso_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES nl_edicoes(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_noticias ADD CONSTRAINT nl_noticias_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES nl_edicoes(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_noticias ADD CONSTRAINT nl_noticias_email_recebido_id_fkey FOREIGN KEY (email_recebido_id) REFERENCES nl_emails_recebidos(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_noticias ADD CONSTRAINT nl_noticias_fonte_id_fkey FOREIGN KEY (fonte_id) REFERENCES nl_fontes_curadoria(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_noticias ADD CONSTRAINT nl_noticias_repeticao_de_fkey FOREIGN KEY (repeticao_de) REFERENCES nl_noticias(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_revista_edicao ADD CONSTRAINT nl_revista_edicao_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES nl_edicoes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_revista_itens ADD CONSTRAINT nl_revista_itens_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES nl_edicoes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_revista_itens ADD CONSTRAINT nl_revista_itens_noticia_id_fkey FOREIGN KEY (noticia_id) REFERENCES nl_noticias(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_secoes_edicao ADD CONSTRAINT nl_secoes_edicao_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES nl_edicoes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.nl_subscricao_eventos ADD CONSTRAINT nl_subscricao_eventos_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES nl_edicoes(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS nl_brief_edicoes_edicao_idx ON public.nl_brief_edicoes USING btree (edicao_id);

CREATE INDEX IF NOT EXISTS nl_brief_eventos_dia_idx ON public.nl_brief_eventos USING btree (dia DESC, evento);

CREATE INDEX IF NOT EXISTS nl_briefs_estado_idx ON public.nl_briefs USING btree (estado);

CREATE INDEX IF NOT EXISTS nl_briefs_fonte_url_norm_idx ON public.nl_briefs USING btree (fonte_url_norm);

CREATE INDEX IF NOT EXISTS nl_briefs_noticia_idx ON public.nl_briefs USING btree (noticia_id);

CREATE INDEX IF NOT EXISTS nl_cronicas_busca_gin ON public.nl_cronicas USING gin (busca);

CREATE INDEX IF NOT EXISTS nl_curadoria_fila_estado_idx ON public.nl_curadoria_fila USING btree (estado, publicado_em DESC);

CREATE INDEX IF NOT EXISTS nl_curadoria_fila_origem_idx ON public.nl_curadoria_fila USING btree (origem, estado);

CREATE UNIQUE INDEX IF NOT EXISTS nl_curadoria_fila_url_norm_uidx ON public.nl_curadoria_fila USING btree (url_norm) WHERE (url_norm IS NOT NULL);

CREATE INDEX IF NOT EXISTS nl_edicoes_agendamento_idx ON public.nl_edicoes USING btree (agendamento_estado, agendado_para);

CREATE UNIQUE INDEX IF NOT EXISTS nl_emails_recebidos_message_id_uidx ON public.nl_emails_recebidos USING btree (message_id) WHERE (message_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS nl_emails_recebidos_processamento_idx ON public.nl_emails_recebidos USING btree (processamento_estado, recebido_em DESC) WHERE (processamento_estado <> 'processado'::text);

CREATE UNIQUE INDEX IF NOT EXISTS nl_emails_recebidos_remetente_hash_uidx ON public.nl_emails_recebidos USING btree (remetente, corpo_hash) WHERE (corpo_hash IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS nl_ferramentas_excluidas_dominio_uk ON public.nl_ferramentas_excluidas USING btree (dominio) WHERE (dominio IS NOT NULL);

CREATE INDEX IF NOT EXISTS nl_ferramentas_excluidas_nome_idx ON public.nl_ferramentas_excluidas USING btree (nome_norm);

CREATE INDEX IF NOT EXISTS nl_ferramentas_semana_edicao_idx ON public.nl_ferramentas_semana USING btree (edicao_id);

CREATE INDEX IF NOT EXISTS nl_ferramentas_sugeridas_edicao_aprovada_idx ON public.nl_ferramentas_sugeridas USING btree (edicao_aprovada_id) WHERE (edicao_aprovada_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS nl_ferramentas_sugeridas_email_idx ON public.nl_ferramentas_sugeridas USING btree (fonte_email_id);

CREATE INDEX IF NOT EXISTS nl_ferramentas_sugeridas_estado_criado_idx ON public.nl_ferramentas_sugeridas USING btree (estado, criado_em DESC);

CREATE UNIQUE INDEX IF NOT EXISTS nl_ferramentas_sugeridas_url_unico ON public.nl_ferramentas_sugeridas USING btree (lower(url));

CREATE INDEX IF NOT EXISTS nl_ia_uso_brief_id_idx ON public.nl_ia_uso USING btree (brief_id);

CREATE INDEX IF NOT EXISTS nl_ia_uso_criado_em_idx ON public.nl_ia_uso USING btree (criado_em DESC);

CREATE INDEX IF NOT EXISTS nl_ia_uso_origem_idx ON public.nl_ia_uso USING btree (origem);

CREATE INDEX IF NOT EXISTS nl_idx_egoi_campanhas_edicao ON public.nl_egoi_campanhas USING btree (edicao_id);

CREATE INDEX IF NOT EXISTS nl_idx_emails_recebidos_recebido_em ON public.nl_emails_recebidos USING btree (recebido_em DESC);

CREATE INDEX IF NOT EXISTS nl_idx_fontes_curadoria_grupo ON public.nl_fontes_curadoria USING btree (grupo);

CREATE INDEX IF NOT EXISTS nl_idx_noticias_edicao_ordem ON public.nl_noticias USING btree (edicao_id, ordem);

CREATE INDEX IF NOT EXISTS nl_idx_noticias_estado ON public.nl_noticias USING btree (estado);

CREATE INDEX IF NOT EXISTS nl_idx_noticias_fonte_created ON public.nl_noticias USING btree (fonte_id, created_at DESC);

CREATE INDEX IF NOT EXISTS nl_idx_noticias_override_destino ON public.nl_noticias USING btree (edicao_id, override_destino);

CREATE INDEX IF NOT EXISTS nl_idx_noticias_repeticao_de ON public.nl_noticias USING btree (repeticao_de) WHERE (repeticao_de IS NOT NULL);

CREATE INDEX IF NOT EXISTS nl_idx_noticias_url_norm ON public.nl_noticias USING btree (url_norm);

CREATE INDEX IF NOT EXISTS nl_idx_secoes_edicao_edicao_ordem ON public.nl_secoes_edicao USING btree (edicao_id, ordem);

CREATE INDEX IF NOT EXISTS nl_import_runs_sha_idx ON public.nl_import_runs USING btree (ficheiro_sha256, created_at DESC);

CREATE INDEX IF NOT EXISTS nl_ix_fontes_tipo_activa ON public.nl_fontes_curadoria USING btree (tipo, activa);

CREATE INDEX IF NOT EXISTS nl_noticias_busca_gin ON public.nl_noticias USING gin (busca);

CREATE INDEX IF NOT EXISTS nl_noticias_email_recebido_id_idx ON public.nl_noticias USING btree (email_recebido_id) WHERE (email_recebido_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS nl_noticias_fonte_estado_idx ON public.nl_noticias USING btree (fonte_estado) WHERE (fonte_estado <> 'ok'::text);

CREATE INDEX IF NOT EXISTS nl_noticias_titulo_trgm_idx ON public.nl_noticias USING gin (titulo extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS nl_revista_itens_edicao_papel_ordem_idx ON public.nl_revista_itens USING btree (edicao_id, papel, ordem);

CREATE INDEX IF NOT EXISTS nl_subscricao_eventos_criado_idx ON public.nl_subscricao_eventos USING btree (criado_em DESC);

CREATE INDEX IF NOT EXISTS nl_subscricao_eventos_email_idx ON public.nl_subscricao_eventos USING btree (lower(email), criado_em DESC);

CREATE INDEX IF NOT EXISTS nl_subscricao_eventos_retoma_idx ON public.nl_subscricao_eventos USING btree (retoma_em) WHERE ((retoma_em IS NOT NULL) AND (retomado_em IS NULL));

CREATE UNIQUE INDEX IF NOT EXISTS nl_uniq_secoes_padrao_por_edicao ON public.nl_secoes_edicao USING btree (edicao_id, tipo) WHERE (tipo <> 'personalizada'::text);

CREATE UNIQUE INDEX IF NOT EXISTS nl_ux_fontes_remetente_email ON public.nl_fontes_curadoria USING btree (lower(remetente_email)) WHERE ((tipo = 'newsletter'::text) AND (remetente_email IS NOT NULL));

ALTER TABLE public.art_rascunhos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_brief_edicoes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_brief_eventos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_brief_versoes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_briefs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_configuracoes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_cronicas ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_curadoria_config ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_curadoria_ferramentas_config ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_curadoria_fila ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_definicoes_ia ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_edicoes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_egoi_campanhas ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_egoi_listas ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_emails_recebidos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_episodios_podcast ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_ferramentas_excluidas ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_ferramentas_semana ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_ferramentas_sugeridas ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_fontes_curadoria ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_ia_uso ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_import_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_noticias ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_prioridades_editoriais ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_revista_edicao ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_revista_itens ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_secoes_edicao ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_subscricao_eventos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nl_user_mapping ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS art_rascunhos_updated_at ON public.art_rascunhos; CREATE TRIGGER art_rascunhos_updated_at BEFORE UPDATE ON public.art_rascunhos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS nl_brief_edicoes_validar_tg ON public.nl_brief_edicoes; CREATE TRIGGER nl_brief_edicoes_validar_tg BEFORE INSERT OR UPDATE ON public.nl_brief_edicoes FOR EACH ROW EXECUTE FUNCTION nl_brief_edicoes_validar();

DROP TRIGGER IF EXISTS nl_briefs_validar_tg ON public.nl_briefs; CREATE TRIGGER nl_briefs_validar_tg BEFORE INSERT OR UPDATE ON public.nl_briefs FOR EACH ROW EXECUTE FUNCTION nl_briefs_validar();

DROP TRIGGER IF EXISTS nl_curadoria_ferramentas_config_updated ON public.nl_curadoria_ferramentas_config; CREATE TRIGGER nl_curadoria_ferramentas_config_updated BEFORE UPDATE ON public.nl_curadoria_ferramentas_config FOR EACH ROW EXECUTE FUNCTION nl_tg_curadoria_config_updated();

DROP TRIGGER IF EXISTS nl_egoi_campanhas_set_actualizado_em ON public.nl_egoi_campanhas; CREATE TRIGGER nl_egoi_campanhas_set_actualizado_em BEFORE UPDATE ON public.nl_egoi_campanhas FOR EACH ROW EXECUTE FUNCTION nl_set_actualizado_em();

DROP TRIGGER IF EXISTS nl_ferramentas_semana_set_updated_at ON public.nl_ferramentas_semana; CREATE TRIGGER nl_ferramentas_semana_set_updated_at BEFORE UPDATE ON public.nl_ferramentas_semana FOR EACH ROW EXECUTE FUNCTION nl_set_updated_at();

DROP TRIGGER IF EXISTS nl_ferramentas_sugeridas_set_updated_at ON public.nl_ferramentas_sugeridas; CREATE TRIGGER nl_ferramentas_sugeridas_set_updated_at BEFORE UPDATE ON public.nl_ferramentas_sugeridas FOR EACH ROW EXECUTE FUNCTION nl_set_updated_at();

DROP TRIGGER IF EXISTS nl_import_runs_updated_at ON public.nl_import_runs; CREATE TRIGGER nl_import_runs_updated_at BEFORE UPDATE ON public.nl_import_runs FOR EACH ROW EXECUTE FUNCTION nl_set_updated_at();

DROP TRIGGER IF EXISTS nl_prioridades_editoriais_set_updated_at ON public.nl_prioridades_editoriais; CREATE TRIGGER nl_prioridades_editoriais_set_updated_at BEFORE UPDATE ON public.nl_prioridades_editoriais FOR EACH ROW EXECUTE FUNCTION nl_set_updated_at();

DROP TRIGGER IF EXISTS nl_revista_edicao_updated_at ON public.nl_revista_edicao; CREATE TRIGGER nl_revista_edicao_updated_at BEFORE UPDATE ON public.nl_revista_edicao FOR EACH ROW EXECUTE FUNCTION nl_set_updated_at();

DROP TRIGGER IF EXISTS nl_revista_itens_updated_at ON public.nl_revista_itens; CREATE TRIGGER nl_revista_itens_updated_at BEFORE UPDATE ON public.nl_revista_itens FOR EACH ROW EXECUTE FUNCTION nl_set_updated_at();

DROP TRIGGER IF EXISTS nl_trg_configuracoes_updated ON public.nl_configuracoes; CREATE TRIGGER nl_trg_configuracoes_updated BEFORE UPDATE ON public.nl_configuracoes FOR EACH ROW EXECUTE FUNCTION nl_set_actualizado_em();

DROP TRIGGER IF EXISTS nl_trg_cronicas_updated_at ON public.nl_cronicas; CREATE TRIGGER nl_trg_cronicas_updated_at BEFORE UPDATE ON public.nl_cronicas FOR EACH ROW EXECUTE FUNCTION nl_set_updated_at();

DROP TRIGGER IF EXISTS nl_trg_curadoria_config_updated ON public.nl_curadoria_config; CREATE TRIGGER nl_trg_curadoria_config_updated BEFORE UPDATE ON public.nl_curadoria_config FOR EACH ROW EXECUTE FUNCTION nl_tg_curadoria_config_updated();

DROP TRIGGER IF EXISTS nl_trg_curadoria_fila_updated_at ON public.nl_curadoria_fila; CREATE TRIGGER nl_trg_curadoria_fila_updated_at BEFORE UPDATE ON public.nl_curadoria_fila FOR EACH ROW EXECUTE FUNCTION nl_set_updated_at();

DROP TRIGGER IF EXISTS nl_trg_definicoes_ia_updated_at ON public.nl_definicoes_ia; CREATE TRIGGER nl_trg_definicoes_ia_updated_at BEFORE UPDATE ON public.nl_definicoes_ia FOR EACH ROW EXECUTE FUNCTION nl_set_updated_at();

DROP TRIGGER IF EXISTS nl_trg_fontes_curadoria_grupo ON public.nl_fontes_curadoria; CREATE TRIGGER nl_trg_fontes_curadoria_grupo BEFORE INSERT OR UPDATE ON public.nl_fontes_curadoria FOR EACH ROW EXECUTE FUNCTION nl_fontes_curadoria_set_grupo();

DROP TRIGGER IF EXISTS nl_trg_noticias_updated_at ON public.nl_noticias; CREATE TRIGGER nl_trg_noticias_updated_at BEFORE UPDATE ON public.nl_noticias FOR EACH ROW EXECUTE FUNCTION nl_set_updated_at();

DROP TRIGGER IF EXISTS nl_trg_noticias_url_norm ON public.nl_noticias; CREATE TRIGGER nl_trg_noticias_url_norm BEFORE INSERT OR UPDATE OF url ON public.nl_noticias FOR EACH ROW EXECUTE FUNCTION nl_noticias_set_url_norm();

DROP TRIGGER IF EXISTS nl_user_mapping_updated_at ON public.nl_user_mapping; CREATE TRIGGER nl_user_mapping_updated_at BEFORE UPDATE ON public.nl_user_mapping FOR EACH ROW EXECUTE FUNCTION nl_set_updated_at();

DROP POLICY IF EXISTS art_rascunhos_equipa ON public.art_rascunhos; CREATE POLICY art_rascunhos_equipa ON public.art_rascunhos AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_audit_admin_leitura ON public.nl_audit_log; CREATE POLICY nl_audit_admin_leitura ON public.nl_audit_log AS PERMISSIVE FOR SELECT TO authenticated USING (nl_is_admin());

DROP POLICY IF EXISTS nl_audit_equipa_insere ON public.nl_audit_log; CREATE POLICY nl_audit_equipa_insere ON public.nl_audit_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_brief_edicoes; CREATE POLICY nl_equipa_total ON public.nl_brief_edicoes AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_publico_brief_edicoes ON public.nl_brief_edicoes; CREATE POLICY nl_publico_brief_edicoes ON public.nl_brief_edicoes AS PERMISSIVE FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM nl_briefs b
  WHERE ((b.id = nl_brief_edicoes.brief_id) AND (b.estado = 'publicado'::text)))));

DROP POLICY IF EXISTS nl_admin_total ON public.nl_brief_eventos; CREATE POLICY nl_admin_total ON public.nl_brief_eventos AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_admin()) WITH CHECK (nl_is_admin());

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_brief_versoes; CREATE POLICY nl_equipa_total ON public.nl_brief_versoes AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_briefs; CREATE POLICY nl_equipa_total ON public.nl_briefs AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_publico_briefs ON public.nl_briefs; CREATE POLICY nl_publico_briefs ON public.nl_briefs AS PERMISSIVE FOR SELECT TO anon USING ((estado = 'publicado'::text));

DROP POLICY IF EXISTS nl_admin_total ON public.nl_configuracoes; CREATE POLICY nl_admin_total ON public.nl_configuracoes AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_admin()) WITH CHECK (nl_is_admin());

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_cronicas; CREATE POLICY nl_equipa_total ON public.nl_cronicas AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_publico_cronicas ON public.nl_cronicas; CREATE POLICY nl_publico_cronicas ON public.nl_cronicas AS PERMISSIVE FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM nl_edicoes e
  WHERE ((e.id = nl_cronicas.edicao_id) AND (e.estado = 'enviada'::text)))));

DROP POLICY IF EXISTS nl_admin_total ON public.nl_curadoria_config; CREATE POLICY nl_admin_total ON public.nl_curadoria_config AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_admin()) WITH CHECK (nl_is_admin());

DROP POLICY IF EXISTS nl_equipa_leitura ON public.nl_curadoria_config; CREATE POLICY nl_equipa_leitura ON public.nl_curadoria_config AS PERMISSIVE FOR SELECT TO authenticated USING (nl_is_staff());

DROP POLICY IF EXISTS nl_admin_total ON public.nl_curadoria_ferramentas_config; CREATE POLICY nl_admin_total ON public.nl_curadoria_ferramentas_config AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_admin()) WITH CHECK (nl_is_admin());

DROP POLICY IF EXISTS nl_equipa_leitura ON public.nl_curadoria_ferramentas_config; CREATE POLICY nl_equipa_leitura ON public.nl_curadoria_ferramentas_config AS PERMISSIVE FOR SELECT TO authenticated USING (nl_is_staff());

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_curadoria_fila; CREATE POLICY nl_equipa_total ON public.nl_curadoria_fila AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_admin_total ON public.nl_definicoes_ia; CREATE POLICY nl_admin_total ON public.nl_definicoes_ia AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_admin()) WITH CHECK (nl_is_admin());

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_edicoes; CREATE POLICY nl_equipa_total ON public.nl_edicoes AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_publico_edicoes ON public.nl_edicoes; CREATE POLICY nl_publico_edicoes ON public.nl_edicoes AS PERMISSIVE FOR SELECT TO anon USING ((estado = 'enviada'::text));

DROP POLICY IF EXISTS nl_admin_total ON public.nl_egoi_campanhas; CREATE POLICY nl_admin_total ON public.nl_egoi_campanhas AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_admin()) WITH CHECK (nl_is_admin());

DROP POLICY IF EXISTS nl_admin_total ON public.nl_egoi_listas; CREATE POLICY nl_admin_total ON public.nl_egoi_listas AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_admin()) WITH CHECK (nl_is_admin());

DROP POLICY IF EXISTS nl_equipa_leitura ON public.nl_egoi_listas; CREATE POLICY nl_equipa_leitura ON public.nl_egoi_listas AS PERMISSIVE FOR SELECT TO authenticated USING (nl_is_staff());

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_emails_recebidos; CREATE POLICY nl_equipa_total ON public.nl_emails_recebidos AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_episodios_podcast; CREATE POLICY nl_equipa_total ON public.nl_episodios_podcast AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_ferramentas_excluidas; CREATE POLICY nl_equipa_total ON public.nl_ferramentas_excluidas AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_ferramentas_semana; CREATE POLICY nl_equipa_total ON public.nl_ferramentas_semana AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_publico_ferramentas ON public.nl_ferramentas_semana; CREATE POLICY nl_publico_ferramentas ON public.nl_ferramentas_semana AS PERMISSIVE FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM nl_edicoes e
  WHERE ((e.id = nl_ferramentas_semana.edicao_id) AND (e.estado = 'enviada'::text)))));

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_ferramentas_sugeridas; CREATE POLICY nl_equipa_total ON public.nl_ferramentas_sugeridas AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_fontes_curadoria; CREATE POLICY nl_equipa_total ON public.nl_fontes_curadoria AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_admin_total ON public.nl_ia_uso; CREATE POLICY nl_admin_total ON public.nl_ia_uso AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_admin()) WITH CHECK (nl_is_admin());

DROP POLICY IF EXISTS nl_import_runs_admin ON public.nl_import_runs; CREATE POLICY nl_import_runs_admin ON public.nl_import_runs AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_admin()) WITH CHECK (nl_is_admin());

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_noticias; CREATE POLICY nl_equipa_total ON public.nl_noticias AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_publico_noticias ON public.nl_noticias; CREATE POLICY nl_publico_noticias ON public.nl_noticias AS PERMISSIVE FOR SELECT TO anon USING (((estado = 'enviada'::text) AND (EXISTS ( SELECT 1
   FROM nl_edicoes e
  WHERE ((e.id = nl_noticias.edicao_id) AND (e.estado = 'enviada'::text))))));

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_prioridades_editoriais; CREATE POLICY nl_equipa_total ON public.nl_prioridades_editoriais AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_revista_edicao; CREATE POLICY nl_equipa_total ON public.nl_revista_edicao AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_publico_revista ON public.nl_revista_edicao; CREATE POLICY nl_publico_revista ON public.nl_revista_edicao AS PERMISSIVE FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM nl_edicoes e
  WHERE ((e.id = nl_revista_edicao.edicao_id) AND (e.estado = 'enviada'::text)))));

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_revista_itens; CREATE POLICY nl_equipa_total ON public.nl_revista_itens AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_publico_revista_itens ON public.nl_revista_itens; CREATE POLICY nl_publico_revista_itens ON public.nl_revista_itens AS PERMISSIVE FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM nl_edicoes e
  WHERE ((e.id = nl_revista_itens.edicao_id) AND (e.estado = 'enviada'::text)))));

DROP POLICY IF EXISTS nl_equipa_total ON public.nl_secoes_edicao; CREATE POLICY nl_equipa_total ON public.nl_secoes_edicao AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_staff()) WITH CHECK (nl_is_staff());

DROP POLICY IF EXISTS nl_publico_secoes ON public.nl_secoes_edicao; CREATE POLICY nl_publico_secoes ON public.nl_secoes_edicao AS PERMISSIVE FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM nl_edicoes e
  WHERE ((e.id = nl_secoes_edicao.edicao_id) AND (e.estado = 'enviada'::text)))));

DROP POLICY IF EXISTS nl_admin_total ON public.nl_subscricao_eventos; CREATE POLICY nl_admin_total ON public.nl_subscricao_eventos AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_admin()) WITH CHECK (nl_is_admin());

DROP POLICY IF EXISTS nl_user_mapping_admin ON public.nl_user_mapping; CREATE POLICY nl_user_mapping_admin ON public.nl_user_mapping AS PERMISSIVE FOR ALL TO authenticated USING (nl_is_admin()) WITH CHECK (nl_is_admin());

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.art_rascunhos TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.art_rascunhos TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.art_rascunhos TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_audit_log TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_audit_log TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_audit_log TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_brief_edicoes TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_brief_edicoes TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_brief_edicoes TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_brief_eventos TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_brief_eventos TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_brief_eventos TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_brief_versoes TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_brief_versoes TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_brief_versoes TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_briefs TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_briefs TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_briefs TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_configuracoes TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_configuracoes TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_configuracoes TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_cronicas TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_cronicas TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_cronicas TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_curadoria_config TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_curadoria_config TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_curadoria_config TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_curadoria_ferramentas_config TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_curadoria_ferramentas_config TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_curadoria_ferramentas_config TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_curadoria_fila TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_curadoria_fila TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_curadoria_fila TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_definicoes_ia TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_definicoes_ia TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_definicoes_ia TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_edicoes TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_edicoes TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_edicoes TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_egoi_campanhas TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_egoi_campanhas TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_egoi_campanhas TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_egoi_listas TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_egoi_listas TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_egoi_listas TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_emails_recebidos TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_emails_recebidos TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_emails_recebidos TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_episodios_podcast TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_episodios_podcast TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_episodios_podcast TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_ferramentas_excluidas TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_ferramentas_excluidas TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_ferramentas_excluidas TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_ferramentas_semana TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_ferramentas_semana TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_ferramentas_semana TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_ferramentas_sugeridas TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_ferramentas_sugeridas TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_ferramentas_sugeridas TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_fontes_curadoria TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_fontes_curadoria TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_fontes_curadoria TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_ia_uso TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_ia_uso TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_ia_uso TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_import_runs TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_import_runs TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_import_runs TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_noticias TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_noticias TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_noticias TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_prioridades_editoriais TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_prioridades_editoriais TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_prioridades_editoriais TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_revista_edicao TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_revista_edicao TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_revista_edicao TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_revista_itens TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_revista_itens TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_revista_itens TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_secoes_edicao TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_secoes_edicao TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_secoes_edicao TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_subscricao_eventos TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_subscricao_eventos TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_subscricao_eventos TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_user_mapping TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_user_mapping TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.nl_user_mapping TO service_role;

REVOKE ALL ON FUNCTION nl_brief_edicoes_validar() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_brief_edicoes_validar() TO service_role;

REVOKE ALL ON FUNCTION nl_briefs_validar() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_briefs_validar() TO service_role;

REVOKE ALL ON FUNCTION nl_contar_dados_antigos(integer) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_contar_dados_antigos(integer) TO authenticated;

REVOKE ALL ON FUNCTION nl_contar_dados_antigos(integer) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_contar_dados_antigos(integer) TO service_role;

REVOKE ALL ON FUNCTION nl_criar_seccoes_padrao(uuid) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_criar_seccoes_padrao(uuid) TO authenticated;

REVOKE ALL ON FUNCTION nl_criar_seccoes_padrao(uuid) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_criar_seccoes_padrao(uuid) TO service_role;

REVOKE ALL ON FUNCTION nl_encontrar_candidatos_repeticao(text,text,real) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_encontrar_candidatos_repeticao(text,text,real) TO authenticated;

REVOKE ALL ON FUNCTION nl_encontrar_candidatos_repeticao(text,text,real) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_encontrar_candidatos_repeticao(text,text,real) TO service_role;

REVOKE ALL ON FUNCTION nl_f_unaccent(text) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_f_unaccent(text) TO authenticated;

REVOKE ALL ON FUNCTION nl_f_unaccent(text) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_f_unaccent(text) TO service_role;

REVOKE ALL ON FUNCTION nl_fontes_curadoria_set_grupo() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_fontes_curadoria_set_grupo() TO service_role;

REVOKE ALL ON FUNCTION nl_import_existentes(text,text,text[]) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_import_existentes(text,text,text[]) TO authenticated;

REVOKE ALL ON FUNCTION nl_import_existentes(text,text,text[]) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_import_existentes(text,text,text[]) TO service_role;

REVOKE ALL ON FUNCTION nl_import_reescrever_url(text,text) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_import_reescrever_url(text,text) TO authenticated;

REVOKE ALL ON FUNCTION nl_import_reescrever_url(text,text) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_import_reescrever_url(text,text) TO service_role;

REVOKE ALL ON FUNCTION nl_import_relatorio() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_import_relatorio() TO authenticated;

REVOKE ALL ON FUNCTION nl_import_relatorio() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_import_relatorio() TO service_role;

REVOKE ALL ON FUNCTION nl_import_repeticoes(jsonb) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_import_repeticoes(jsonb) TO authenticated;

REVOKE ALL ON FUNCTION nl_import_repeticoes(jsonb) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_import_repeticoes(jsonb) TO service_role;

REVOKE ALL ON FUNCTION nl_import_rows(text,jsonb) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_import_rows(text,jsonb) TO authenticated;

REVOKE ALL ON FUNCTION nl_import_rows(text,jsonb) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_import_rows(text,jsonb) TO service_role;

REVOKE ALL ON FUNCTION nl_import_suspender_agendamentos() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_import_suspender_agendamentos() TO authenticated;

REVOKE ALL ON FUNCTION nl_import_suspender_agendamentos() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_import_suspender_agendamentos() TO service_role;

REVOKE ALL ON FUNCTION nl_is_admin() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_is_admin() TO authenticated;

REVOKE ALL ON FUNCTION nl_is_admin() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_is_admin() TO service_role;

REVOKE ALL ON FUNCTION nl_is_service() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_is_service() TO authenticated;

REVOKE ALL ON FUNCTION nl_is_service() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_is_service() TO service_role;

REVOKE ALL ON FUNCTION nl_is_staff() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_is_staff() TO authenticated;

REVOKE ALL ON FUNCTION nl_is_staff() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_is_staff() TO service_role;

REVOKE ALL ON FUNCTION nl_limpar_dados_antigos(integer) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_limpar_dados_antigos(integer) TO authenticated;

REVOKE ALL ON FUNCTION nl_limpar_dados_antigos(integer) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_limpar_dados_antigos(integer) TO service_role;

REVOKE ALL ON FUNCTION nl_mapear_perfil(uuid,uuid) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_mapear_perfil(uuid,uuid) TO authenticated;

REVOKE ALL ON FUNCTION nl_mapear_perfil(uuid,uuid) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_mapear_perfil(uuid,uuid) TO service_role;

REVOKE ALL ON FUNCTION nl_me_papel() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_me_papel() TO authenticated;

REVOKE ALL ON FUNCTION nl_me_papel() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_me_papel() TO service_role;

REVOKE ALL ON FUNCTION nl_mover_seccao(uuid,text) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_mover_seccao(uuid,text) TO authenticated;

REVOKE ALL ON FUNCTION nl_mover_seccao(uuid,text) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_mover_seccao(uuid,text) TO service_role;

REVOKE ALL ON FUNCTION nl_normalizar_url_sql(text) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_normalizar_url_sql(text) TO authenticated;

REVOKE ALL ON FUNCTION nl_normalizar_url_sql(text) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_normalizar_url_sql(text) TO service_role;

REVOKE ALL ON FUNCTION nl_noticias_set_url_norm() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_noticias_set_url_norm() TO service_role;

REVOKE ALL ON FUNCTION nl_pesquisar_arquivo(text,integer) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_pesquisar_arquivo(text,integer) TO authenticated;

REVOKE ALL ON FUNCTION nl_pesquisar_arquivo(text,integer) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_pesquisar_arquivo(text,integer) TO service_role;

REVOKE ALL ON FUNCTION nl_pesquisar_global(text,text[],uuid,integer) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_pesquisar_global(text,text[],uuid,integer) TO authenticated;

REVOKE ALL ON FUNCTION nl_pesquisar_global(text,text[],uuid,integer) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_pesquisar_global(text,text[],uuid,integer) TO service_role;

REVOKE ALL ON FUNCTION nl_registar_evento_brief(text,text,integer) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_registar_evento_brief(text,text,integer) TO service_role;

REVOKE ALL ON FUNCTION nl_reordenar_noticias(uuid,uuid[]) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_reordenar_noticias(uuid,uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION nl_reordenar_noticias(uuid,uuid[]) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_reordenar_noticias(uuid,uuid[]) TO service_role;

REVOKE ALL ON FUNCTION nl_reordenar_seccoes(uuid,uuid[]) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_reordenar_seccoes(uuid,uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION nl_reordenar_seccoes(uuid,uuid[]) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_reordenar_seccoes(uuid,uuid[]) TO service_role;

REVOKE ALL ON FUNCTION nl_set_actualizado_em() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_set_actualizado_em() TO service_role;

REVOKE ALL ON FUNCTION nl_set_updated_at() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_set_updated_at() TO service_role;

REVOKE ALL ON FUNCTION nl_stats_fontes_30d() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_stats_fontes_30d() TO authenticated;

REVOKE ALL ON FUNCTION nl_stats_fontes_30d() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_stats_fontes_30d() TO service_role;

REVOKE ALL ON FUNCTION nl_tg_curadoria_config_updated() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION nl_tg_curadoria_config_updated() TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('nl-imagens-edicao','nl-imagens-edicao',false,NULL,NULL) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('nl-import-staging','nl-import-staging',false,209715200,NULL) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS nl_imagens_actualizar ON storage.objects; CREATE POLICY nl_imagens_actualizar ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'nl-imagens-edicao'::text) AND nl_is_staff()));

DROP POLICY IF EXISTS nl_imagens_apagar ON storage.objects; CREATE POLICY nl_imagens_apagar ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'nl-imagens-edicao'::text) AND nl_is_admin()));

DROP POLICY IF EXISTS nl_imagens_inserir ON storage.objects; CREATE POLICY nl_imagens_inserir ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'nl-imagens-edicao'::text) AND nl_is_staff()));

DROP POLICY IF EXISTS nl_imagens_ler ON storage.objects; CREATE POLICY nl_imagens_ler ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'nl-imagens-edicao'::text) AND nl_is_staff()));

DROP POLICY IF EXISTS nl_staging_admin ON storage.objects; CREATE POLICY nl_staging_admin ON storage.objects AS PERMISSIVE FOR ALL TO authenticated USING (((bucket_id = 'nl-import-staging'::text) AND nl_is_admin())) WITH CHECK (((bucket_id = 'nl-import-staging'::text) AND nl_is_admin()));
