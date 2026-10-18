-- Team roles authorise actions; they do not grant access to another account's data.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);
ALTER TABLE public.instagram_analytics ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);
ALTER TABLE public.instagram_profiles ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['posts','posts_drafts','instagram_analytics','instagram_profiles'] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (user_id=auth.uid() AND (project_id IS NULL OR public.mc_pode_ler(project_id))) WITH CHECK (user_id=auth.uid() AND (project_id IS NULL OR public.mc_pode_ler(project_id)))',t||'_isolar',t);
  END LOOP;
END $$;
CREATE POLICY media_isolar ON public.media_library AS RESTRICTIVE FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY jobs_sociais_isolar ON public.scheduled_jobs AS RESTRICTIVE FOR ALL TO authenticated
  USING(created_by=auth.uid() AND (post_id IS NULL OR EXISTS(SELECT 1 FROM public.posts WHERE id=post_id AND user_id=auth.uid())))
  WITH CHECK(created_by=auth.uid() AND (post_id IS NULL OR EXISTS(SELECT 1 FROM public.posts WHERE id=post_id AND user_id=auth.uid())));
CREATE POLICY artigos_isolar ON public.art_rascunhos AS RESTRICTIVE FOR ALL TO authenticated
  USING(created_by=auth.uid() AND (project_id IS NULL OR public.mc_pode_ler(project_id)))
  WITH CHECK(created_by=auth.uid() AND (project_id IS NULL OR public.mc_pode_ler(project_id)));
CREATE FUNCTION public.artigo_proteger_autoria() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Não é permitido mudar a autoria de um artigo' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER artigo_autoria BEFORE UPDATE ON public.art_rascunhos FOR EACH ROW EXECUTE FUNCTION public.artigo_proteger_autoria();

CREATE FUNCTION public.social_proteger_autoria() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.project_id IS DISTINCT FROM OLD.project_id) THEN
    RAISE EXCEPTION 'Não é permitido mudar a conta ou o projeto de um registo existente' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['posts','posts_drafts','instagram_analytics','instagram_profiles'] LOOP
    EXECUTE format('CREATE TRIGGER social_autoria BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.social_proteger_autoria()',t);
  END LOOP;
END $$;
-- Preserve historic duplicate rows; new concurrent imports cannot create more.
CREATE FUNCTION public.social_analytics_deduplicar() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE chave text;
BEGIN
  chave:=coalesce(nullif(NEW.shortcode,''),NEW.post_url);
  IF auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Proprietário inválido' USING ERRCODE='42501';
  END IF;
  IF chave IS NULL THEN RAISE EXCEPTION 'Identificador de publicação em falta' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text||':'||coalesce(NEW.project_id::text,'')||':'||chave,0));
  IF EXISTS(SELECT 1 FROM public.instagram_analytics WHERE user_id=NEW.user_id AND project_id IS NOT DISTINCT FROM NEW.project_id AND coalesce(nullif(shortcode,''),post_url)=chave) THEN RETURN NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER social_analytics_dedup BEFORE INSERT ON public.instagram_analytics FOR EACH ROW EXECUTE FUNCTION public.social_analytics_deduplicar();
-- A competitor's profile on the same day must not collide across accounts/projects.
ALTER TABLE public.instagram_profiles DROP CONSTRAINT IF EXISTS instagram_profiles_username_scraped_date_key;
CREATE UNIQUE INDEX instagram_profiles_conta_projeto_dia ON public.instagram_profiles(user_id,project_id,username,scraped_date) NULLS NOT DISTINCT;
CREATE INDEX posts_origem_proprietario ON public.posts(user_id,workflow_id);
CREATE FUNCTION public.social_post_deduplicar() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Proprietário inválido' USING ERRCODE='42501';
  END IF;
  IF NEW.user_id IS NULL OR nullif(NEW.workflow_id,'') IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text||':'||NEW.workflow_id,0));
  IF EXISTS(SELECT 1 FROM public.posts WHERE user_id=NEW.user_id AND workflow_id=NEW.workflow_id) THEN RETURN NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER social_post_dedup BEFORE INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.social_post_deduplicar();