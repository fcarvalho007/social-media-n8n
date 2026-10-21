-- Cloud-compatible installation of 0062; bucket provisioned through Storage API.
CREATE TABLE public.hub_editorial_estados (
 project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE RESTRICT,
 revisao bigint NOT NULL DEFAULT 1 CHECK(revisao>0), dados jsonb NOT NULL CHECK(jsonb_typeof(dados)='object'),
 atualizado_em timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.hub_editorial_estados FROM anon,authenticated;
GRANT SELECT ON public.hub_editorial_estados TO authenticated;
GRANT ALL ON public.hub_editorial_estados TO service_role;
CREATE TABLE public.hub_editorial_artefactos (
 project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
 tipo text NOT NULL CHECK(tipo IN ('resultado','resposta','backup')), chave text NOT NULL CHECK(length(chave) BETWEEN 1 AND 160),
 dados jsonb NOT NULL, criado_em timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(project_id,tipo,chave)
);
REVOKE ALL ON public.hub_editorial_artefactos FROM anon,authenticated;
GRANT ALL ON public.hub_editorial_artefactos TO service_role;
CREATE TABLE public.hub_documentos (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
 hash text NOT NULL CHECK(hash ~ '^[a-f0-9]{64}$'), dados jsonb NOT NULL CHECK(jsonb_typeof(dados)='object'),
 pdf_path text NOT NULL, capa_path text, revisao bigint NOT NULL DEFAULT 1 CHECK(revisao>0),
 criado_por uuid NOT NULL, criado_em timestamptz NOT NULL DEFAULT now(), atualizado_em timestamptz NOT NULL DEFAULT now(),
 UNIQUE(project_id,hash), CHECK(pdf_path=project_id::text||'/'||hash||'/original.pdf'),
 CHECK(capa_path IS NULL OR capa_path LIKE project_id::text||'/'||hash||'/capa-%.png')
);
REVOKE ALL ON public.hub_documentos FROM anon,authenticated;
GRANT SELECT ON public.hub_documentos TO authenticated;
GRANT ALL ON public.hub_documentos TO service_role;
CREATE TABLE public.hub_recolhas (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
 dados jsonb NOT NULL CHECK(jsonb_typeof(dados)='object'), criado_em timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.hub_recolhas FROM anon,authenticated;
GRANT SELECT ON public.hub_recolhas TO authenticated;
GRANT ALL ON public.hub_recolhas TO service_role;
CREATE TABLE public.hub_operacao (
 project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE RESTRICT,
 pausado boolean NOT NULL DEFAULT true, agenda_documentos jsonb, atualizado_em timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.hub_operacao FROM anon,authenticated;
GRANT SELECT ON public.hub_operacao TO authenticated;
GRANT ALL ON public.hub_operacao TO service_role;
CREATE TABLE public.hub_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
 tipo text NOT NULL CHECK(tipo IN ('seo_ciclo','documentos_recolha','wordpress','documento_preparar')),
 dedup text NOT NULL CHECK(length(dedup) BETWEEN 1 AND 180), pedido jsonb NOT NULL CHECK(jsonb_typeof(pedido)='object'),
 estado text NOT NULL DEFAULT 'fila' CHECK(estado IN ('fila','em_curso','concluido','falhou','incerto','cancelado')),
 lease_token uuid, lease_ate timestamptz, tentativas integer NOT NULL DEFAULT 0,
 proximo_em timestamptz NOT NULL DEFAULT now(), criado_em timestamptz NOT NULL DEFAULT now(), atualizado_em timestamptz NOT NULL DEFAULT now(),
 resultado jsonb, erro text, UNIQUE(project_id,tipo,dedup)
);
REVOKE ALL ON public.hub_jobs FROM anon,authenticated;
GRANT SELECT ON public.hub_jobs TO authenticated;
GRANT ALL ON public.hub_jobs TO service_role;
CREATE INDEX hub_jobs_fila ON public.hub_jobs(proximo_em,criado_em) WHERE estado='fila';
CREATE TABLE public.hub_leases (
 project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT, recurso text NOT NULL,
 token uuid NOT NULL, ate timestamptz NOT NULL, PRIMARY KEY(project_id,recurso)
);
REVOKE ALL ON public.hub_leases FROM anon,authenticated;
GRANT ALL ON public.hub_leases TO service_role;
CREATE TABLE public.hub_publicacoes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
 pauta_id uuid NOT NULL, site_id text NOT NULL, versao integer NOT NULL, assinatura text NOT NULL,
 destino text NOT NULL DEFAULT 'draft' CHECK(destino IN ('draft','publish')), remoto_modificado_em text,
 estado text NOT NULL CHECK(estado IN ('reservado','enviado','incerto','falhou')),
 remoto_id bigint, remoto_url text, criado_em timestamptz NOT NULL DEFAULT now(), atualizado_em timestamptz NOT NULL DEFAULT now(),
 UNIQUE(project_id,pauta_id,site_id,versao,destino)
);
REVOKE ALL ON public.hub_publicacoes FROM anon,authenticated;
GRANT SELECT ON public.hub_publicacoes TO authenticated;
GRANT ALL ON public.hub_publicacoes TO service_role;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['hub_editorial_estados','hub_editorial_artefactos','hub_documentos','hub_recolhas','hub_operacao','hub_jobs','hub_leases','hub_publicacoes'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  IF t NOT IN ('hub_leases','hub_editorial_artefactos') THEN
   EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id))',t||'_ler',t);
  END IF;
 END LOOP;
END $$;
CREATE FUNCTION public.hub_lease_reservar(_projeto uuid,_recurso text,_segundos integer DEFAULT 180) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v uuid:=gen_random_uuid(); r uuid;
BEGIN
 IF _segundos NOT BETWEEN 30 AND 600 OR length(_recurso)>100 THEN RAISE EXCEPTION 'Lease inválido'; END IF;
 PERFORM 1 FROM projects WHERE id=_projeto FOR UPDATE;
 IF (_recurso='backup' AND EXISTS(SELECT 1 FROM hub_leases WHERE project_id=_projeto AND recurso<>'backup' AND ate>now())) OR
 (_recurso<>'backup' AND EXISTS(SELECT 1 FROM hub_leases WHERE project_id=_projeto AND recurso='backup' AND ate>now())) THEN RETURN NULL; END IF;
 INSERT INTO hub_leases(project_id,recurso,token,ate) VALUES(_projeto,_recurso,v,now()+make_interval(secs=>_segundos))
 ON CONFLICT(project_id,recurso) DO UPDATE SET token=excluded.token,ate=excluded.ate WHERE hub_leases.ate<now() RETURNING token INTO r;
 RETURN r;
END $$;
CREATE FUNCTION public.hub_lease_renovar(_projeto uuid,_recurso text,_token uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 WITH u AS(UPDATE hub_leases SET ate=now()+interval '180 seconds' WHERE project_id=_projeto AND recurso=_recurso AND token=_token AND ate>now() RETURNING 1) SELECT EXISTS(SELECT 1 FROM u)
$$;
CREATE FUNCTION public.hub_lease_libertar(_projeto uuid,_recurso text,_token uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ DELETE FROM hub_leases WHERE project_id=_projeto AND recurso=_recurso AND token=_token $$;
CREATE FUNCTION public.hub_estado_guardar(_projeto uuid,_revisao bigint,_dados jsonb,_token uuid) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v bigint;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM hub_leases WHERE project_id=_projeto AND recurso='seo' AND token=_token AND ate>now()) THEN RAISE EXCEPTION 'Lease expirado' USING ERRCODE='MC409'; END IF;
 IF _revisao=0 THEN
  INSERT INTO hub_editorial_estados(project_id,dados) VALUES(_projeto,_dados) ON CONFLICT DO NOTHING RETURNING revisao INTO v;
 ELSE
  UPDATE hub_editorial_estados SET dados=_dados,revisao=revisao+1,atualizado_em=now() WHERE project_id=_projeto AND revisao=_revisao RETURNING revisao INTO v;
 END IF;
 IF v IS NULL THEN RAISE EXCEPTION 'Versão alterada; reabrir' USING ERRCODE='MC409'; END IF; RETURN v;
END $$;
CREATE FUNCTION public.hub_enfileirar(_projeto uuid,_tipo text,_dedup text,_pedido jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v uuid;
BEGIN
 IF NOT public.mc_pode_escrever(_projeto) THEN RAISE EXCEPTION 'Sem acesso ao projeto' USING ERRCODE='42501'; END IF;
 IF coalesce((SELECT pausado FROM hub_operacao WHERE project_id=_projeto),true) THEN RAISE EXCEPTION 'Automação pausada'; END IF;
 INSERT INTO hub_jobs(project_id,tipo,dedup,pedido) VALUES(_projeto,_tipo,_dedup,_pedido||jsonb_build_object('userId',auth.uid())) ON CONFLICT(project_id,tipo,dedup) DO NOTHING RETURNING id INTO v;
 RETURN coalesce(v,(SELECT id FROM hub_jobs WHERE project_id=_projeto AND tipo=_tipo AND dedup=_dedup));
END $$;
CREATE FUNCTION public.hub_job_reservar(_tipos text[] DEFAULT ARRAY['seo_ciclo','documentos_recolha','wordpress','documento_preparar']) RETURNS SETOF public.hub_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE hub_jobs SET estado='fila',lease_token=NULL,lease_ate=NULL,atualizado_em=now() WHERE tipo='documento_preparar' AND estado='em_curso' AND lease_ate<now() AND tentativas<3 AND NOT EXISTS(SELECT 1 FROM hub_leases l WHERE l.project_id=hub_jobs.project_id AND l.recurso='backup' AND l.ate>now());
 UPDATE hub_jobs SET estado='incerto',erro='Execução interrompida; conferir resultado antes de repetir.',lease_token=NULL,lease_ate=NULL,atualizado_em=now() WHERE estado='em_curso' AND lease_ate<now() AND NOT EXISTS(SELECT 1 FROM hub_leases l WHERE l.project_id=hub_jobs.project_id AND l.recurso='backup' AND l.ate>now());
 UPDATE hub_documentos d SET dados=jsonb_set(dados,'{processamento}',jsonb_build_object('estado','erro','paginas',jsonb_array_length(dados->'pdf'->'paginas'),'total',dados->'processamento'->'total','erro','A extração foi interrompida três vezes. O original está preservado; retoma ou trata este PDF localmente.')),revisao=revisao+1,atualizado_em=now() WHERE coalesce(dados->'processamento'->>'estado','')<>'erro' AND EXISTS(SELECT 1 FROM hub_jobs j WHERE j.project_id=d.project_id AND j.tipo='documento_preparar' AND j.estado='incerto' AND j.tentativas>=3 AND j.pedido->>'documentoId'=d.id::text AND j.pedido->>'capa' IS DISTINCT FROM 'true' AND NOT EXISTS(SELECT 1 FROM hub_jobs k WHERE k.project_id=j.project_id AND k.tipo=j.tipo AND k.pedido->>'documentoId'=d.id::text AND (k.pedido->>'capa') IS NOT DISTINCT FROM (j.pedido->>'capa') AND k.criado_em>j.criado_em)) AND NOT EXISTS(SELECT 1 FROM hub_leases l WHERE l.project_id=d.project_id AND l.recurso='backup' AND l.ate>now());
 UPDATE hub_documentos d SET dados=jsonb_set(dados,'{capaErro}',to_jsonb('Não foi possível gerar a capa nos limites da nuvem. O original e o texto foram preservados.'::text)),revisao=revisao+1,atualizado_em=now() WHERE NOT(dados ? 'capaErro') AND EXISTS(SELECT 1 FROM hub_jobs j WHERE j.project_id=d.project_id AND j.tipo='documento_preparar' AND j.estado='incerto' AND j.tentativas>=3 AND j.pedido->>'documentoId'=d.id::text AND j.pedido->>'capa'='true' AND NOT EXISTS(SELECT 1 FROM hub_jobs k WHERE k.project_id=j.project_id AND k.tipo=j.tipo AND k.pedido->>'documentoId'=d.id::text AND k.pedido->>'capa'='true' AND k.criado_em>j.criado_em)) AND NOT EXISTS(SELECT 1 FROM hub_leases l WHERE l.project_id=d.project_id AND l.recurso='backup' AND l.ate>now());
 RETURN QUERY WITH q AS(SELECT j.id FROM hub_jobs j JOIN hub_operacao o USING(project_id) WHERE j.estado='fila' AND j.tipo=ANY(_tipos) AND j.proximo_em<=now() AND NOT o.pausado ORDER BY j.proximo_em,j.criado_em FOR UPDATE OF j SKIP LOCKED LIMIT 1)
 UPDATE hub_jobs j SET estado='em_curso',lease_token=gen_random_uuid(),lease_ate=now()+interval '180 seconds',tentativas=tentativas+1,atualizado_em=now() FROM q WHERE j.id=q.id RETURNING j.*;
END $$;
CREATE FUNCTION public.hub_job_renovar(_id uuid,_token uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 WITH u AS(UPDATE hub_jobs j SET lease_ate=now()+interval '180 seconds',atualizado_em=now() WHERE j.id=_id AND j.lease_token=_token AND j.estado='em_curso' AND j.lease_ate>now() AND NOT coalesce((SELECT pausado FROM hub_operacao o WHERE o.project_id=j.project_id),true) RETURNING 1) SELECT EXISTS(SELECT 1 FROM u)
$$;
CREATE FUNCTION public.hub_job_progresso(_id uuid,_token uuid,_resultado jsonb) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 WITH u AS(UPDATE hub_jobs SET resultado=_resultado,atualizado_em=now() WHERE id=_id AND lease_token=_token AND estado='em_curso' AND lease_ate>now() RETURNING 1) SELECT EXISTS(SELECT 1 FROM u)
$$;
CREATE FUNCTION public.hub_job_concluir(_id uuid,_token uuid,_estado text,_resultado jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v boolean;
BEGIN
 IF _estado NOT IN ('concluido','falhou','incerto') THEN RAISE EXCEPTION 'Estado inválido'; END IF;
 WITH u AS(UPDATE hub_jobs SET estado=_estado,resultado=coalesce(resultado,'{}'::jsonb)||coalesce(_resultado,'{}'::jsonb),lease_token=NULL,lease_ate=NULL,atualizado_em=now() WHERE id=_id AND lease_token=_token AND estado='em_curso' AND lease_ate>now() RETURNING 1) SELECT EXISTS(SELECT 1 FROM u) INTO v;
 RETURN v;
END $$;
CREATE FUNCTION public.hub_operacao_definir(_projeto uuid,_pausado boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.mc_pode_escrever(_projeto) THEN RAISE EXCEPTION 'Sem acesso' USING ERRCODE='42501'; END IF;
 INSERT INTO hub_operacao(project_id,pausado) VALUES(_projeto,_pausado) ON CONFLICT(project_id) DO UPDATE SET pausado=excluded.pausado,atualizado_em=now();
END $$;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT oid::regprocedure AS sig FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('hub_lease_reservar','hub_lease_renovar','hub_lease_libertar','hub_estado_guardar','hub_enfileirar','hub_job_reservar','hub_job_renovar','hub_job_concluir','hub_job_progresso','hub_operacao_definir') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.sig);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.sig);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.hub_enfileirar(uuid,text,text,jsonb), public.hub_operacao_definir(uuid,boolean) TO authenticated;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='hub-documentos' AND public) THEN RAISE EXCEPTION 'hub-documentos tem de ser privado'; END IF; END $$;
CREATE POLICY hub_documentos_storage_ler ON storage.objects FOR SELECT TO authenticated USING(
 bucket_id='hub-documentos' AND public.mc_pode_ler(CASE WHEN split_part(name,'/',1) ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' THEN split_part(name,'/',1)::uuid END)
);
CREATE FUNCTION public.hub_restaurar(_projeto uuid,_owner uuid,_tabelas jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t text; n bigint; permitidas text[]:=ARRAY['hub_editorial_estados','hub_editorial_artefactos','hub_documentos','hub_recolhas','hub_operacao','hub_jobs','hub_publicacoes'];
BEGIN
 PERFORM 1 FROM projects WHERE id=_projeto AND owner_id=_owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Projeto de destino sem proprietário válido' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(_tabelas)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(_tabelas))<>7 THEN RAISE EXCEPTION 'Cópia inválida'; END IF;
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
CREATE FUNCTION public.hub_exigir_fora_backup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p uuid;
BEGIN
 p:=CASE WHEN TG_OP='DELETE' THEN OLD.project_id ELSE NEW.project_id END;
 PERFORM 1 FROM projects WHERE id=p FOR UPDATE;
 IF EXISTS(SELECT 1 FROM hub_leases WHERE project_id=p AND recurso='backup' AND ate>now()) THEN RAISE EXCEPTION 'Cópia consistente em curso; repetir a edição depois' USING ERRCODE='MC409'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.hub_exigir_fora_backup() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['hub_editorial_estados','hub_editorial_artefactos','hub_documentos','hub_recolhas','hub_operacao','hub_jobs','hub_publicacoes'] LOOP
  EXECUTE format('CREATE TRIGGER hub_barreira_backup BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION public.hub_exigir_fora_backup()',t);
 END LOOP;
END $$;
CREATE FUNCTION public.hub_job_adiar(_id uuid,_token uuid,_pedido jsonb,_resultado jsonb) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 WITH u AS(UPDATE hub_jobs SET estado='fila',pedido=_pedido,resultado=_resultado,lease_token=NULL,lease_ate=NULL,proximo_em=now(),atualizado_em=now() WHERE id=_id AND lease_token=_token AND estado='em_curso' AND lease_ate>now() AND tipo='documentos_recolha' RETURNING 1) SELECT EXISTS(SELECT 1 FROM u)
$$;
REVOKE ALL ON FUNCTION public.hub_job_adiar(uuid,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hub_job_adiar(uuid,uuid,jsonb,jsonb) TO service_role;