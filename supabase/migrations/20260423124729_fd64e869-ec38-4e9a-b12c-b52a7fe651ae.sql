
-- ============================================
-- FASE 1.1: profiles — esconder e-mails de anónimos
-- ============================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- FASE 2: remover policies redundantes "public_*" e "debug_allow_all"
-- ============================================

-- posts
DROP POLICY IF EXISTS public_delete_posts ON public.posts;
DROP POLICY IF EXISTS debug_allow_all ON public.posts;

-- projects
DROP POLICY IF EXISTS public_read_projects ON public.projects;
DROP POLICY IF EXISTS public_insert_projects ON public.projects;
DROP POLICY IF EXISTS public_update_projects ON public.projects;
DROP POLICY IF EXISTS public_delete_projects ON public.projects;

-- milestones
DROP POLICY IF EXISTS public_read_milestones ON public.milestones;
DROP POLICY IF EXISTS public_insert_milestones ON public.milestones;
DROP POLICY IF EXISTS public_update_milestones ON public.milestones;
DROP POLICY IF EXISTS public_delete_milestones ON public.milestones;

-- tasks
DROP POLICY IF EXISTS public_read_tasks ON public.tasks;
DROP POLICY IF EXISTS public_insert_tasks ON public.tasks;
DROP POLICY IF EXISTS public_update_tasks ON public.tasks;
DROP POLICY IF EXISTS public_delete_tasks ON public.tasks;

-- task_dependencies
DROP POLICY IF EXISTS public_read_task_dependencies ON public.task_dependencies;
DROP POLICY IF EXISTS public_insert_task_dependencies ON public.task_dependencies;
DROP POLICY IF EXISTS public_update_task_dependencies ON public.task_dependencies;
DROP POLICY IF EXISTS public_delete_task_dependencies ON public.task_dependencies;

-- task_milestones
DROP POLICY IF EXISTS public_read_task_milestones ON public.task_milestones;
DROP POLICY IF EXISTS public_insert_task_milestones ON public.task_milestones;
DROP POLICY IF EXISTS public_update_task_milestones ON public.task_milestones;
DROP POLICY IF EXISTS public_delete_task_milestones ON public.task_milestones;

-- stories
DROP POLICY IF EXISTS public_read_stories ON public.stories;
DROP POLICY IF EXISTS public_delete_stories ON public.stories;

-- ============================================
-- FASE 3: idempotency_keys — restringir a service_role
-- ============================================
DROP POLICY IF EXISTS "Service role full access" ON public.idempotency_keys;

CREATE POLICY "Service role manages idempotency keys"
  ON public.idempotency_keys FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================
-- FASE 4.3: storage — restringir LIST a authenticated, manter GET público
-- (URLs diretos continuam a funcionar; deixa de ser possível listar nomes de ficheiros)
-- ============================================

-- Remover policies antigas (nomes podem variar; tentamos os mais comuns)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

-- Política de leitura pública por ficheiro específico (necessária para URLs diretos)
CREATE POLICY "Public can read individual files in public buckets"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id IN ('pdfs', 'post-covers', 'ai-generated-images', 'publications'));
