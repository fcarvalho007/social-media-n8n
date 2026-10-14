-- Team membership = has any explicit role in user_roles (admin/editor/viewer).
CREATE OR REPLACE FUNCTION public.social_membro()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) $$;
REVOKE ALL ON FUNCTION public.social_membro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.social_membro() TO authenticated, service_role;

-- media_library
DROP POLICY IF EXISTS "Team can view all media" ON public.media_library;
DROP POLICY IF EXISTS "Users can insert media" ON public.media_library;
DROP POLICY IF EXISTS "Users can update their own media" ON public.media_library;
DROP POLICY IF EXISTS "Users can delete their own media" ON public.media_library;
CREATE POLICY "media_ler" ON public.media_library FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.social_membro());
CREATE POLICY "media_criar" ON public.media_library FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "media_editar" ON public.media_library FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.social_pode_escrever()) WITH CHECK (auth.uid() = user_id OR public.social_pode_escrever());
CREATE POLICY "media_apagar" ON public.media_library FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.social_pode_escrever());

-- posts
DROP POLICY IF EXISTS "Team can view all posts" ON public.posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "posts_ler" ON public.posts FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.social_membro());
CREATE POLICY "posts_criar" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_editar" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.social_pode_escrever()) WITH CHECK (auth.uid() = user_id OR public.social_pode_escrever());
CREATE POLICY "posts_apagar" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.social_pode_escrever());

-- posts_drafts
DROP POLICY IF EXISTS "Authenticated users can view all drafts" ON public.posts_drafts;
CREATE POLICY "drafts_ler" ON public.posts_drafts FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.social_membro());

-- stories (no owner column: team only)
DROP POLICY IF EXISTS "Team can view all stories" ON public.stories;
DROP POLICY IF EXISTS "authenticated_read_stories" ON public.stories;
CREATE POLICY "stories_ler" ON public.stories FOR SELECT TO authenticated USING (public.social_membro());

-- profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "profiles_ler_proprio_ou_equipa" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.social_membro());

-- estudio_identidades
DROP POLICY IF EXISTS "ident_ler" ON public.estudio_identidades;
CREATE POLICY "ident_ler" ON public.estudio_identidades FOR SELECT TO authenticated USING (public.social_membro());

-- reference caches
DROP POLICY IF EXISTS "Authenticated users can read mention cache" ON public.linkedin_mention_cache;
CREATE POLICY "mention_cache_ler" ON public.linkedin_mention_cache FOR SELECT TO authenticated USING (public.social_membro());
DROP POLICY IF EXISTS "Authenticated users can view verified hashtag intelligence" ON public.hashtag_intelligence;
CREATE POLICY "hashtag_intel_ler" ON public.hashtag_intelligence FOR SELECT TO authenticated USING (public.social_membro());
DROP POLICY IF EXISTS "Authenticated users can view hashtag metadata" ON public.hashtag_metadata;
CREATE POLICY "hashtag_meta_ler" ON public.hashtag_metadata FOR SELECT TO authenticated USING (public.social_membro());

-- instagram: remove public read; owner policies stay; team members may read
DROP POLICY IF EXISTS "Allow public read access to instagram_analytics" ON public.instagram_analytics;
DROP POLICY IF EXISTS "Allow public read access to instagram_profiles" ON public.instagram_profiles;
CREATE POLICY "ig_analytics_ler_equipa" ON public.instagram_analytics FOR SELECT TO authenticated USING (public.social_membro());
CREATE POLICY "ig_profiles_ler_equipa" ON public.instagram_profiles FOR SELECT TO authenticated USING (public.social_membro());
REVOKE ALL ON public.instagram_analytics, public.instagram_profiles FROM anon;