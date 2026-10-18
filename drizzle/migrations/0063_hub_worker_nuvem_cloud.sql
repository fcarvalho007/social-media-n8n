-- lovable-cron-fallback-reviewed: install supplied time-based document agenda scheduler inactive; zero runs now, any activation requires separate controlled pilot and cadence/cost review.
CREATE TABLE public.hub_worker_config(id boolean PRIMARY KEY DEFAULT true CHECK(id),token text NOT NULL,url text NOT NULL,ativo boolean NOT NULL DEFAULT false);
REVOKE ALL ON public.hub_worker_config FROM anon,authenticated;
GRANT ALL ON public.hub_worker_config TO service_role;
ALTER TABLE public.hub_worker_config ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.hub_worker_instalar(_url text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF _url !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/hub-editorial-worker$' THEN RAISE EXCEPTION 'Destino Cloud inválido'; END IF;
 INSERT INTO hub_worker_config(id,token,url) VALUES(true,replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),_url) ON CONFLICT(id) DO UPDATE SET url=excluded.url;
END $$;
REVOKE ALL ON FUNCTION public.hub_worker_instalar(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hub_worker_instalar(text) TO service_role;
CREATE FUNCTION public.hub_worker_acordar() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.hub_worker_config;
BEGIN
 SELECT * INTO c FROM hub_worker_config WHERE id AND ativo;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM hub_operacao WHERE NOT pausado) THEN RETURN; END IF;
 PERFORM net.http_post(url:=c.url,headers:=jsonb_build_object('Content-Type','application/json','x-hub-worker',c.token),body:='{}'::jsonb,timeout_milliseconds:=140000);
END $$;
REVOKE ALL ON FUNCTION public.hub_worker_acordar() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hub_worker_acordar() TO service_role;
DO $$ DECLARE j bigint; BEGIN
 SELECT jobid INTO j FROM cron.job WHERE jobname='hub-editorial-worker';
 IF j IS NULL THEN SELECT cron.schedule('hub-editorial-worker','* * * * *','SELECT public.hub_worker_acordar()') INTO j; END IF;
 PERFORM cron.alter_job(j,active:=false);
END $$;
CREATE FUNCTION public.hub_agenda_documentos_definir(_projeto uuid,_agenda jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.mc_pode_escrever(_projeto) THEN RAISE EXCEPTION 'Sem acesso' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(_agenda->'ativa') IS DISTINCT FROM 'boolean' OR jsonb_typeof(_agenda->'dias') IS DISTINCT FROM 'array' OR jsonb_array_length(_agenda->'dias') NOT BETWEEN 1 AND 7 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(_agenda->'dias') n WHERE n !~ '^[0-6]$') OR coalesce(_agenda->>'hora','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'Agenda inválida'; END IF;
 INSERT INTO hub_operacao(project_id,agenda_documentos) VALUES(_projeto,_agenda) ON CONFLICT(project_id) DO UPDATE SET agenda_documentos=excluded.agenda_documentos,atualizado_em=now();
END $$;
REVOKE ALL ON FUNCTION public.hub_agenda_documentos_definir(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hub_agenda_documentos_definir(uuid,jsonb) TO authenticated,service_role;