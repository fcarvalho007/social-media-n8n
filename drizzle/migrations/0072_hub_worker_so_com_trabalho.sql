CREATE OR REPLACE FUNCTION public.hub_worker_acordar()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c public.hub_worker_config;
BEGIN
 SELECT * INTO c FROM hub_worker_config WHERE id AND ativo;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM hub_operacao WHERE NOT pausado) THEN RETURN; END IF;
 -- Skip the HTTP wake-up when there is nothing the worker could do: no due jobs,
 -- no active document schedule and editorial automation paused in every project.
 IF NOT EXISTS(SELECT 1 FROM hub_jobs WHERE (estado='fila' AND (proximo_em IS NULL OR proximo_em<=now())) OR (estado='em_curso' AND (lease_ate IS NULL OR lease_ate<now())))
    AND NOT EXISTS(SELECT 1 FROM hub_operacao WHERE NOT pausado AND (agenda_documentos->>'ativa')='true')
    AND NOT EXISTS(SELECT 1 FROM hub_operacao o JOIN hub_editorial_estados e USING(project_id)
                   WHERE NOT o.pausado AND (e.dados->'configuracao'->>'automacaoPausada')='false' AND (e.dados->'configuracao'->>'pausado')='false')
 THEN RETURN; END IF;
 PERFORM net.http_post(url:=c.url,headers:=jsonb_build_object('Content-Type','application/json','x-hub-worker',c.token),body:='{}'::jsonb,timeout_milliseconds:=140000);
END $function$;