CREATE OR REPLACE FUNCTION public.social_pode_escrever()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role) $$;
REVOKE ALL ON FUNCTION public.social_pode_escrever() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.social_pode_escrever() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.social_tem_papel()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) $$;
REVOKE ALL ON FUNCTION public.social_tem_papel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.social_tem_papel() TO authenticated, service_role;

-- stories: no anonymous writes; team writes for admin/editor; service role (scheduler) unaffected by RLS.
DROP POLICY IF EXISTS "Allow public inserts" ON public.stories;
DROP POLICY IF EXISTS "anon_update_stories" ON public.stories;
DROP POLICY IF EXISTS "authenticated_update_stories" ON public.stories;
CREATE POLICY "Editors update stories" ON public.stories FOR UPDATE TO authenticated
  USING (public.social_pode_escrever())
  WITH CHECK (public.social_pode_escrever() AND status = ANY (ARRAY['pending','approved','rejected']));
CREATE POLICY "Editors insert stories" ON public.stories FOR INSERT TO authenticated
  WITH CHECK (public.social_pode_escrever());

-- profiles: own profile or admin only.
DROP POLICY IF EXISTS "Authenticated users can update full names" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- scheduled_jobs: no anonymous access; team read for accounts with a role; writes for admin/editor.
DROP POLICY IF EXISTS "Users can view their own scheduled jobs" ON public.scheduled_jobs;
DROP POLICY IF EXISTS "Users can update their own scheduled jobs" ON public.scheduled_jobs;
DROP POLICY IF EXISTS "Users can insert their own scheduled jobs" ON public.scheduled_jobs;
CREATE POLICY "Team views scheduled jobs" ON public.scheduled_jobs FOR SELECT TO authenticated
  USING (public.social_tem_papel());
CREATE POLICY "Editors update scheduled jobs" ON public.scheduled_jobs FOR UPDATE TO authenticated
  USING (public.social_pode_escrever()) WITH CHECK (public.social_pode_escrever());
CREATE POLICY "Editors insert scheduled jobs" ON public.scheduled_jobs FOR INSERT TO authenticated
  WITH CHECK (public.social_pode_escrever() AND created_by = auth.uid());

-- posts_drafts: shared team drafts kept, but writes only for admin/editor.
DROP POLICY IF EXISTS "Team can delete all drafts" ON public.posts_drafts;
DROP POLICY IF EXISTS "Team can update all drafts" ON public.posts_drafts;
DROP POLICY IF EXISTS "Users can insert their own drafts" ON public.posts_drafts;
DROP POLICY IF EXISTS "Users can create their own drafts" ON public.posts_drafts;
CREATE POLICY "Editors delete drafts" ON public.posts_drafts FOR DELETE TO authenticated USING (public.social_pode_escrever());
CREATE POLICY "Editors update drafts" ON public.posts_drafts FOR UPDATE TO authenticated
  USING (public.social_pode_escrever()) WITH CHECK (public.social_pode_escrever());
CREATE POLICY "Editors create own drafts" ON public.posts_drafts FOR INSERT TO authenticated
  WITH CHECK (public.social_pode_escrever() AND auth.uid() = user_id);

-- Worker lease: token-based acquire/release (CAS), so an old run cannot release a newer lease.
ALTER TABLE public.nl_worker_estado ADD COLUMN IF NOT EXISTS lease_token uuid;

CREATE OR REPLACE FUNCTION public.nl_worker_reservar(_nome text, _segundos integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE tok uuid := gen_random_uuid();
BEGIN
  IF NOT public.nl_is_service() AND current_user NOT IN ('postgres','service_role') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  INSERT INTO public.nl_worker_estado (nome) VALUES (_nome) ON CONFLICT (nome) DO NOTHING;
  UPDATE public.nl_worker_estado
     SET lease_ate = now() + make_interval(secs => greatest(30, least(_segundos, 900))), lease_token = tok, actualizado_em = now()
   WHERE nome = _nome AND (lease_ate IS NULL OR lease_ate < now());
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN tok;
END $$;

CREATE OR REPLACE FUNCTION public.nl_worker_libertar(_nome text, _token uuid, _resultado jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.nl_is_service() AND current_user NOT IN ('postgres','service_role') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.nl_worker_estado
     SET lease_ate = NULL, lease_token = NULL, ultima_execucao = now(), ultimo_resultado = _resultado, actualizado_em = now()
   WHERE nome = _nome AND lease_token = _token;
  RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION public.nl_worker_reservar(text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nl_worker_libertar(text,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nl_worker_reservar(text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.nl_worker_libertar(text,uuid,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.nl_worker_adquirir(text,integer) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.nl_worker_adquirir(text,integer) IS 'DEPRECATED: replaced by nl_worker_reservar/nl_worker_libertar (token CAS)';