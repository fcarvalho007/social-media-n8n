-- Cloud adaptation of 0064: owner UUID without auth FK; grants precede RLS.
-- Cron deactivation blocked by Cloud permissions; retired function deployed separately, cron remains a reported blocker.
CREATE TABLE public.social_publicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id),
  destino text NOT NULL,
  fase text NOT NULL CHECK (fase IN ('publicar','aprovar')),
  fingerprint text NOT NULL CHECK (length(fingerprint)=64),
  estado text NOT NULL DEFAULT 'em_curso' CHECK (estado IN ('em_curso','aceite','incerto','recusado')),
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  resultado jsonb,
  http_status integer,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,post_id,destino,fase)
);
REVOKE ALL ON public.social_publicacoes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.social_publicacoes TO authenticated;
GRANT ALL ON public.social_publicacoes TO service_role;
ALTER TABLE public.social_publicacoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX social_publicacoes_conteudo ON public.social_publicacoes(user_id,destino,fase,fingerprint,criado_em);
CREATE POLICY social_publicacoes_proprias ON public.social_publicacoes FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE FUNCTION public.social_publicacao_reservar(_user uuid,_post uuid,_destino text,_fase text,_fingerprint text)
RETURNS TABLE(reservada boolean,id uuid,token uuid,estado text,resultado jsonb,http_status integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.social_publicacoes; p public.posts;
BEGIN
  IF _fase NOT IN ('publicar','aprovar') OR length(_destino) NOT BETWEEN 1 AND 100 OR _fingerprint !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Pedido inválido' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user AND role::text IN ('admin','editor')) THEN
    RAISE EXCEPTION 'Sem permissão editorial' USING ERRCODE='42501';
  END IF;
  SELECT * INTO p FROM public.posts WHERE posts.id=_post AND user_id=_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Publicação inacessível' USING ERRCODE='42501'; END IF;
  IF p.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.projects pr WHERE pr.id=p.project_id AND pr.owner_id=_user) THEN
    RAISE EXCEPTION 'Projeto inacessível' USING ERRCODE='42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_user::text||':'||_destino||':'||_fase,0));
  SELECT * INTO r FROM public.social_publicacoes s
   WHERE s.user_id=_user AND s.destino=_destino AND s.fase=_fase
     AND (s.post_id=_post OR (s.fingerprint=_fingerprint AND s.criado_em>now()-interval '24 hours'))
   ORDER BY s.criado_em LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT false,r.id,r.token,r.estado,r.resultado,r.http_status; RETURN;
  END IF;
  IF _fase='publicar' AND (
    coalesce(p.external_post_ids->>split_part(_destino,':',1),'')<>'' OR
    EXISTS(SELECT 1 FROM public.publication_attempts a WHERE a.post_id=_post AND a.platform=split_part(_destino,':',1) AND a.status='success')
  ) THEN
    RETURN QUERY SELECT false,NULL::uuid,NULL::uuid,'aceite'::text,NULL::jsonb,409; RETURN;
  END IF;
  INSERT INTO public.social_publicacoes(user_id,post_id,destino,fase,fingerprint)
    VALUES(_user,_post,_destino,_fase,_fingerprint) RETURNING * INTO r;
  RETURN QUERY SELECT true,r.id,r.token,r.estado,r.resultado,r.http_status;
END $$;
CREATE FUNCTION public.social_publicacao_concluir(_id uuid,_token uuid,_estado text,_resultado jsonb,_http_status integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF _estado NOT IN ('aceite','incerto','recusado') OR _http_status NOT BETWEEN 200 AND 599 THEN
    RAISE EXCEPTION 'Resultado inválido' USING ERRCODE='22023';
  END IF;
  UPDATE public.social_publicacoes SET estado=_estado,resultado=_resultado,http_status=_http_status,atualizado_em=now()
    WHERE id=_id AND token=_token AND estado='em_curso';
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.social_publicacao_reservar(uuid,uuid,text,text,text),public.social_publicacao_concluir(uuid,uuid,text,jsonb,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.social_publicacao_reservar(uuid,uuid,text,text,text),public.social_publicacao_concluir(uuid,uuid,text,jsonb,integer) TO service_role;