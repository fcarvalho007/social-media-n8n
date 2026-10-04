DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['nl_audit_log','nl_brief_edicoes','nl_brief_eventos','nl_brief_versoes','nl_briefs','nl_configuracoes',
    'nl_cronicas','nl_curadoria_config','nl_curadoria_ferramentas_config','nl_curadoria_fila','nl_definicoes_ia','nl_edicoes',
    'nl_egoi_campanhas','nl_egoi_listas','nl_emails_recebidos','nl_episodios_podcast','nl_ferramentas_excluidas',
    'nl_ferramentas_semana','nl_ferramentas_sugeridas','nl_fontes_curadoria','nl_ia_uso','nl_noticias',
    'nl_prioridades_editoriais','nl_revista_edicao','nl_revista_itens','nl_secoes_edicao','nl_subscricao_eventos'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
  -- Editorial tables: admin + curador (editor) full access
  FOREACH t IN ARRAY ARRAY['nl_brief_edicoes','nl_brief_versoes','nl_briefs','nl_cronicas','nl_curadoria_fila','nl_edicoes',
    'nl_emails_recebidos','nl_episodios_podcast','nl_ferramentas_excluidas','nl_ferramentas_semana','nl_ferramentas_sugeridas',
    'nl_fontes_curadoria','nl_noticias','nl_prioridades_editoriais','nl_revista_edicao','nl_revista_itens','nl_secoes_edicao'] LOOP
    EXECUTE format('CREATE POLICY nl_equipa_total ON public.%I FOR ALL TO authenticated USING (public.nl_is_staff()) WITH CHECK (public.nl_is_staff())', t);
  END LOOP;
  -- Sensitive / configuration tables: admin only (staff may read config of curation)
  FOREACH t IN ARRAY ARRAY['nl_configuracoes','nl_definicoes_ia','nl_ia_uso','nl_egoi_campanhas','nl_egoi_listas',
    'nl_subscricao_eventos','nl_brief_eventos','nl_curadoria_config','nl_curadoria_ferramentas_config'] LOOP
    EXECUTE format('CREATE POLICY nl_admin_total ON public.%I FOR ALL TO authenticated USING (public.nl_is_admin()) WITH CHECK (public.nl_is_admin())', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['nl_curadoria_config','nl_curadoria_ferramentas_config','nl_egoi_listas'] LOOP
    EXECUTE format('CREATE POLICY nl_equipa_leitura ON public.%I FOR SELECT TO authenticated USING (public.nl_is_staff())', t);
  END LOOP;
END $$;
CREATE POLICY nl_audit_admin_leitura ON public.nl_audit_log FOR SELECT TO authenticated USING (public.nl_is_admin());
CREATE POLICY nl_audit_equipa_insere ON public.nl_audit_log FOR INSERT TO authenticated WITH CHECK (public.nl_is_staff());

-- Public read: only editorial content of sent editions / published briefs
GRANT SELECT ON public.nl_edicoes, public.nl_cronicas, public.nl_revista_edicao, public.nl_revista_itens,
  public.nl_secoes_edicao, public.nl_ferramentas_semana, public.nl_briefs, public.nl_brief_edicoes TO anon;
GRANT SELECT (id, edicao_id, titulo, descricao, url, categoria, estado, destino, destaque, ordem, url_curto, created_at)
  ON public.nl_noticias TO anon;
CREATE POLICY nl_publico_edicoes ON public.nl_edicoes FOR SELECT TO anon USING (estado = 'enviada');
CREATE POLICY nl_publico_noticias ON public.nl_noticias FOR SELECT TO anon
  USING (estado = 'enviada' AND EXISTS (SELECT 1 FROM public.nl_edicoes e WHERE e.id = nl_noticias.edicao_id AND e.estado = 'enviada'));
CREATE POLICY nl_publico_cronicas ON public.nl_cronicas FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.nl_edicoes e WHERE e.id = nl_cronicas.edicao_id AND e.estado = 'enviada'));
CREATE POLICY nl_publico_revista ON public.nl_revista_edicao FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.nl_edicoes e WHERE e.id = nl_revista_edicao.edicao_id AND e.estado = 'enviada'));
CREATE POLICY nl_publico_revista_itens ON public.nl_revista_itens FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.nl_edicoes e WHERE e.id = nl_revista_itens.edicao_id AND e.estado = 'enviada'));
CREATE POLICY nl_publico_secoes ON public.nl_secoes_edicao FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.nl_edicoes e WHERE e.id = nl_secoes_edicao.edicao_id AND e.estado = 'enviada'));
CREATE POLICY nl_publico_ferramentas ON public.nl_ferramentas_semana FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.nl_edicoes e WHERE e.id = nl_ferramentas_semana.edicao_id AND e.estado = 'enviada'));
CREATE POLICY nl_publico_briefs ON public.nl_briefs FOR SELECT TO anon USING (estado = 'publicado');
CREATE POLICY nl_publico_brief_edicoes ON public.nl_brief_edicoes FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.nl_briefs b WHERE b.id = nl_brief_edicoes.brief_id AND b.estado = 'publicado'));

REVOKE ALL ON FUNCTION public.nl_registar_evento_brief(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nl_registar_evento_brief(text, text, integer) TO service_role;
REVOKE ALL ON FUNCTION public.nl_limpar_dados_antigos(integer), public.nl_contar_dados_antigos(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nl_limpar_dados_antigos(integer), public.nl_contar_dados_antigos(integer) TO authenticated;

CREATE TABLE public.nl_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  modo text NOT NULL CHECK (modo IN ('dry_run', 'importacao')),
  estado text NOT NULL DEFAULT 'em_curso' CHECK (estado IN ('em_curso', 'concluida', 'falhada')),
  ficheiro_sha256 text NOT NULL,
  staging_path text,
  manifesto jsonb NOT NULL DEFAULT '{}'::jsonb,
  progresso jsonb NOT NULL DEFAULT '{}'::jsonb,
  relatorio jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz
);
CREATE INDEX nl_import_runs_sha_idx ON public.nl_import_runs (ficheiro_sha256, created_at DESC);
CREATE TABLE public.nl_user_mapping (
  source_user_id uuid PRIMARY KEY,
  source_nome text,
  source_email text,
  source_papel text,
  target_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.nl_user_mapping.source_papel IS 'Informativo apenas. Nunca usado para atribuir permissões; papéis vêm de user_roles por acção admin separada.';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_import_runs, public.nl_user_mapping TO authenticated;
GRANT ALL ON public.nl_import_runs, public.nl_user_mapping TO service_role;
ALTER TABLE public.nl_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_user_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY nl_import_runs_admin ON public.nl_import_runs FOR ALL TO authenticated
  USING (public.nl_is_admin()) WITH CHECK (public.nl_is_admin());
CREATE POLICY nl_user_mapping_admin ON public.nl_user_mapping FOR ALL TO authenticated
  USING (public.nl_is_admin()) WITH CHECK (public.nl_is_admin());
CREATE TRIGGER nl_user_mapping_updated_at BEFORE UPDATE ON public.nl_user_mapping
  FOR EACH ROW EXECUTE FUNCTION public.nl_set_updated_at();
CREATE TRIGGER nl_import_runs_updated_at BEFORE UPDATE ON public.nl_import_runs
  FOR EACH ROW EXECUTE FUNCTION public.nl_set_updated_at();

CREATE OR REPLACE FUNCTION public.nl_import_rows(_tabela text, _linhas jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
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
END $$;

CREATE OR REPLACE FUNCTION public.nl_import_existentes(_tabela text, _pk text, _ids text[])
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
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
END $$;

CREATE OR REPLACE FUNCTION public.nl_import_repeticoes(_pares jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
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
END $$;

CREATE OR REPLACE FUNCTION public.nl_import_reescrever_url(_antigo text, _novo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
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
END $$;

CREATE OR REPLACE FUNCTION public.nl_import_suspender_agendamentos()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_n int;
BEGIN
  IF NOT public.nl_is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  UPDATE public.nl_edicoes
     SET agendamento_erro = 'Suspenso na migração (era ' || agendamento_estado || ')',
         agendamento_estado = 'nenhum'
   WHERE agendamento_estado IN ('agendado', 'a_executar');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('suspensas', v_n);
END $$;

CREATE OR REPLACE FUNCTION public.nl_import_relatorio()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
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
END $$;
REVOKE ALL ON FUNCTION public.nl_import_rows(text, jsonb), public.nl_import_repeticoes(jsonb), public.nl_import_relatorio(),
  public.nl_import_existentes(text, text, text[]), public.nl_import_reescrever_url(text, text), public.nl_import_suspender_agendamentos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nl_import_rows(text, jsonb), public.nl_import_repeticoes(jsonb), public.nl_import_relatorio(),
  public.nl_import_existentes(text, text, text[]), public.nl_import_reescrever_url(text, text), public.nl_import_suspender_agendamentos() TO authenticated;

CREATE TABLE public.art_rascunhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  titulo text NOT NULL DEFAULT '',
  resumo text,
  corpo text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'rascunho' CHECK (estado IN ('rascunho', 'revisao')),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.art_rascunhos TO authenticated;
GRANT ALL ON public.art_rascunhos TO service_role;
ALTER TABLE public.art_rascunhos ENABLE ROW LEVEL SECURITY;
CREATE POLICY art_rascunhos_equipa ON public.art_rascunhos FOR ALL TO authenticated
  USING (public.nl_is_staff()) WITH CHECK (public.nl_is_staff());
CREATE TRIGGER art_rascunhos_updated_at BEFORE UPDATE ON public.art_rascunhos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY nl_imagens_ler ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'nl-imagens-edicao' AND public.nl_is_staff());
CREATE POLICY nl_imagens_inserir ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'nl-imagens-edicao' AND public.nl_is_staff());
CREATE POLICY nl_imagens_actualizar ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'nl-imagens-edicao' AND public.nl_is_staff());
CREATE POLICY nl_imagens_apagar ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'nl-imagens-edicao' AND public.nl_is_admin());
CREATE POLICY nl_staging_admin ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'nl-import-staging' AND public.nl_is_admin())
  WITH CHECK (bucket_id = 'nl-import-staging' AND public.nl_is_admin());