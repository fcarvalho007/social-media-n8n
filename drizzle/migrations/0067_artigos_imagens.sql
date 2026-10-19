-- Private article assets. No client writes; existing project permission checks apply.
CREATE TABLE IF NOT EXISTS public.hub_artigo_imagens (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 hash text NOT NULL CHECK(hash ~ '^[a-f0-9]{64}$'), nome text NOT NULL, tipo text NOT NULL CHECK(tipo IN('image/png','image/jpeg','image/webp')),
 bytes integer NOT NULL CHECK(bytes BETWEEN 24 AND 8388608), caminho text NOT NULL UNIQUE, criado_em timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id,hash)
);
ALTER TABLE public.hub_artigo_imagens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hub_artigo_imagens FROM anon,authenticated;
GRANT SELECT ON public.hub_artigo_imagens TO authenticated;
GRANT ALL ON public.hub_artigo_imagens TO service_role;
CREATE POLICY hub_artigo_imagens_ler ON public.hub_artigo_imagens FOR SELECT TO authenticated USING(public.mc_pode_ler(project_id));
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('hub-artigos','hub-artigos',false,8388608,ARRAY['image/png','image/jpeg','image/webp']) ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=8388608,allowed_mime_types=excluded.allowed_mime_types;
CREATE TABLE IF NOT EXISTS public.hub_wp_imagens (
 project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE, site_id text NOT NULL, hash text NOT NULL,
 estado text NOT NULL CHECK(estado IN('reservado','enviado','incerto')), metadados jsonb NOT NULL DEFAULT '{}'::jsonb, remoto_id bigint, remoto_url text, criado_em timestamptz NOT NULL DEFAULT now(), atualizado_em timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(project_id,site_id,hash)
);
ALTER TABLE public.hub_wp_imagens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hub_wp_imagens FROM anon,authenticated;
GRANT SELECT ON public.hub_wp_imagens TO authenticated;
GRANT ALL ON public.hub_wp_imagens TO service_role;
CREATE POLICY hub_wp_imagens_ler ON public.hub_wp_imagens FOR SELECT TO authenticated USING(public.mc_pode_ler(project_id));

-- Durable receipts for the exact featured image and transactional event outbox sync.
ALTER TABLE public.hub_publicacoes ADD COLUMN IF NOT EXISTS imagem_esperada bigint;
ALTER TABLE public.hub_publicacoes ADD COLUMN IF NOT EXISTS escrita_iniciada boolean;
ALTER TABLE public.hub_publicacoes ADD COLUMN IF NOT EXISTS evento_estado text;
CREATE INDEX IF NOT EXISTS hub_publicacoes_notificar ON public.hub_publicacoes(project_id,atualizado_em) WHERE evento_estado IS NULL AND estado IN('enviado','incerto');

CREATE OR REPLACE FUNCTION public.hub_restaurar(_projeto uuid,_owner uuid,_tabelas jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t text; n bigint; permitidas text[]:=ARRAY['hub_editorial_estados','hub_editorial_artefactos','hub_documentos','hub_recolhas','hub_operacao','hub_jobs','hub_publicacoes','hub_artigo_imagens','hub_wp_imagens'];
BEGIN
 PERFORM 1 FROM projects WHERE id=_projeto AND owner_id=_owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Projeto de destino sem proprietário válido' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(_tabelas)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(_tabelas) k WHERE NOT(k=ANY(permitidas))) THEN RAISE EXCEPTION 'Cópia inválida'; END IF;
 FOREACH t IN ARRAY ARRAY['hub_artigo_imagens','hub_wp_imagens'] LOOP
  IF NOT(_tabelas ? t) THEN _tabelas:=jsonb_set(_tabelas,ARRAY[t],'[]'::jsonb); END IF;
 END LOOP;
 FOREACH t IN ARRAY permitidas LOOP
  IF jsonb_typeof(_tabelas->t) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Tabela ausente'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(_tabelas->t) r WHERE r->>'project_id' IS DISTINCT FROM _projeto::text) THEN RAISE EXCEPTION 'A cópia mistura projetos'; END IF;
  EXECUTE format('SELECT count(*) FROM %I WHERE project_id=$1',t) INTO n USING _projeto;
  IF n<>0 THEN RAISE EXCEPTION 'O projeto de destino tem dados; restauro recusado' USING ERRCODE='MC409'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(_tabelas->'hub_operacao') r WHERE r->>'pausado' IS DISTINCT FROM 'true') OR
 EXISTS(SELECT 1 FROM jsonb_array_elements(_tabelas->'hub_jobs') r WHERE r->>'estado' IN ('fila','em_curso')) OR
 EXISTS(SELECT 1 FROM jsonb_array_elements(_tabelas->'hub_editorial_estados') r WHERE r->'dados'->'configuracao'->>'pausado' IS DISTINCT FROM 'true' OR r->'dados'->'configuracao'->>'automacaoPausada' IS DISTINCT FROM 'true') THEN RAISE EXCEPTION 'Restauro exige operações pausadas'; END IF;
 FOREACH t IN ARRAY permitidas LOOP
  EXECUTE format('INSERT INTO %I SELECT * FROM jsonb_populate_recordset(NULL::%I,$1)',t,t) USING _tabelas->t;
 END LOOP;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.hub_restaurar(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hub_restaurar(uuid,uuid,jsonb) TO service_role;


DO $$ BEGIN
 IF to_regprocedure('public.hub_exigir_fora_backup()') IS NOT NULL THEN
  CREATE TRIGGER hub_barreira_backup BEFORE INSERT OR UPDATE OR DELETE ON public.hub_artigo_imagens FOR EACH ROW EXECUTE FUNCTION public.hub_exigir_fora_backup();
  CREATE TRIGGER hub_barreira_backup BEFORE INSERT OR UPDATE OR DELETE ON public.hub_wp_imagens FOR EACH ROW EXECUTE FUNCTION public.hub_exigir_fora_backup();
 END IF;
END $$;
