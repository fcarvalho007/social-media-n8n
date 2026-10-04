ALTER TABLE public.nl_conteudos_jobs ADD COLUMN IF NOT EXISTS lease_token uuid;
ALTER TABLE public.nl_conteudos_derivados
  ADD COLUMN IF NOT EXISTS social_draft_versao integer,
  ADD COLUMN IF NOT EXISTS social_envio_token uuid,
  ADD COLUMN IF NOT EXISTS social_envio_ate timestamptz;

-- Lease-based reservation: a_processar is recovered only after its lease expired; each reservation gets a fresh token.
CREATE OR REPLACE FUNCTION public.nl_reservar_jobs_conteudos(_limite integer)
RETURNS SETOF public.nl_conteudos_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.nl_conteudos_jobs
     SET estado = 'erro', erro = 'Processamento interrompido repetidamente (lease expirado).',
         tentativas = tentativas + 1, reservado_ate = NULL, lease_token = NULL, actualizado_em = now()
   WHERE estado = 'a_processar' AND reservado_ate < now() AND tentativas + 1 >= max_tentativas;

  RETURN QUERY
  UPDATE public.nl_conteudos_jobs j
     SET reservado_ate = now() + interval '10 minutes',
         lease_token = gen_random_uuid(),
         estado = CASE WHEN j.estado = 'a_processar' THEN 'pendente' ELSE j.estado END,
         tentativas = CASE WHEN j.estado = 'a_processar' THEN j.tentativas + 1 ELSE j.tentativas END,
         actualizado_em = now()
   WHERE j.id IN (
     SELECT id FROM public.nl_conteudos_jobs
      WHERE ((estado IN ('aguarda_confirmacao','pendente','aguarda_credencial')
              AND proxima_tentativa_em <= now()
              AND (reservado_ate IS NULL OR reservado_ate < now()))
          OR (estado = 'a_processar' AND reservado_ate < now()))
      ORDER BY proxima_tentativa_em
      LIMIT greatest(1, least(_limite, 5))
      FOR UPDATE SKIP LOCKED)
  RETURNING j.*;
END $$;
REVOKE ALL ON FUNCTION public.nl_reservar_jobs_conteudos(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nl_reservar_jobs_conteudos(integer) TO service_role;

-- Atomic compare-and-set of carousel + history row.
CREATE OR REPLACE FUNCTION public.nl_conteudos_guardar_versao(
  _conteudo_id uuid, _versao_esperada integer, _carrossel jsonb, _origem text, _utilizador uuid, _so_se_vazio boolean)
RETURNS TABLE(versao integer, actualizado_em timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v integer; t timestamptz;
BEGIN
  UPDATE public.nl_conteudos_derivados d
     SET carrossel = _carrossel, versao = d.versao + 1, actualizado_por = _utilizador, actualizado_em = now()
   WHERE d.id = _conteudo_id AND d.versao = _versao_esperada AND (NOT _so_se_vazio OR d.carrossel IS NULL)
  RETURNING d.versao, d.actualizado_em INTO v, t;
  IF v IS NULL THEN RETURN; END IF;
  INSERT INTO public.nl_conteudos_versoes (conteudo_id, versao, carrossel, origem, criado_por)
  VALUES (_conteudo_id, v, _carrossel, _origem, _utilizador);
  versao := v; actualizado_em := t; RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.nl_conteudos_guardar_versao(uuid,integer,jsonb,text,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nl_conteudos_guardar_versao(uuid,integer,jsonb,text,uuid,boolean) TO service_role;

-- Single in-flight social send per content (double click / several tabs).
CREATE OR REPLACE FUNCTION public.nl_conteudos_reservar_envio_social(_conteudo_id uuid, _versao integer, _substituir boolean)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE tok uuid := gen_random_uuid();
BEGIN
  UPDATE public.nl_conteudos_derivados d
     SET social_envio_token = tok, social_envio_ate = now() + interval '2 minutes'
   WHERE d.id = _conteudo_id AND d.versao = _versao
     AND (d.social_envio_ate IS NULL OR d.social_envio_ate < now())
     AND (_substituir OR d.social_draft_id IS NULL OR d.social_draft_versao IS DISTINCT FROM _versao);
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN tok;
END $$;
REVOKE ALL ON FUNCTION public.nl_conteudos_reservar_envio_social(uuid,integer,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nl_conteudos_reservar_envio_social(uuid,integer,boolean) TO service_role;

-- Storage object facts (owner, MIME) for server-side URL validation.
CREATE OR REPLACE FUNCTION public.nl_storage_objeto(_bucket text, _nome text)
RETURNS TABLE(owner_id text, mimetype text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT coalesce(o.owner_id, o.owner::text), o.metadata->>'mimetype'
    FROM storage.objects o WHERE o.bucket_id = _bucket AND o.name = _nome
$$;
REVOKE ALL ON FUNCTION public.nl_storage_objeto(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nl_storage_objeto(text,text) TO service_role;

-- DB-level guarantee: one social draft per carousel content + version.
CREATE UNIQUE INDEX IF NOT EXISTS posts_drafts_carrossel_cronica_unico
  ON public.posts_drafts ((origem->>'conteudo_id'), (origem->>'versao'))
  WHERE origem->>'tipo' = 'carrossel_cronica';