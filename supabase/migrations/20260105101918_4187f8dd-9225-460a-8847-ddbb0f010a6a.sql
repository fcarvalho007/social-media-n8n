-- ═══════════════════════════════════════════════════════════
-- POSTS: Permitir que todos os utilizadores autenticados VEjam todos os posts
-- ═══════════════════════════════════════════════════════════

-- Remover política restritiva de SELECT
DROP POLICY IF EXISTS "Users can view their own posts" ON posts;

-- Criar política permissiva de SELECT para toda a equipa
CREATE POLICY "Team can view all posts"
  ON posts
  FOR SELECT
  TO authenticated
  USING (true);

-- Manter UPDATE restrito ao owner (ou NULL para compatibilidade)
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
CREATE POLICY "Users can update their own posts"
  ON posts
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id) OR (user_id IS NULL));

-- ═══════════════════════════════════════════════════════════
-- MEDIA_LIBRARY: Permitir que todos vejam todas as médias
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view their own media" ON media_library;
CREATE POLICY "Team can view all media"
  ON media_library
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Permitir inserir média própria OU média de publicações onde user_id é NULL
DROP POLICY IF EXISTS "Users can insert their own media" ON media_library;
CREATE POLICY "Users can insert media"
  ON media_library
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));

-- UPDATE: Manter restrito ao owner
DROP POLICY IF EXISTS "Users can update their own media" ON media_library;
CREATE POLICY "Users can update their own media"
  ON media_library
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id) OR (user_id IS NULL));

-- DELETE: Manter restrito ao owner
DROP POLICY IF EXISTS "Users can delete their own media" ON media_library;
CREATE POLICY "Users can delete their own media"
  ON media_library
  FOR DELETE
  TO authenticated
  USING ((auth.uid() = user_id) OR (user_id IS NULL));

-- ═══════════════════════════════════════════════════════════
-- CORRIGIR: Actualizar posts antigos com user_id = NULL
-- Atribuir ao utilizador admin existente para não perder dados
-- ═══════════════════════════════════════════════════════════

UPDATE posts 
SET user_id = '4eae1189-dc4b-4a14-8fb1-46f0790bb9e6'
WHERE user_id IS NULL;

-- ═══════════════════════════════════════════════════════════
-- STORIES: Mesma lógica de permissões
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view their own stories" ON stories;
CREATE POLICY "Team can view all stories"
  ON stories
  FOR SELECT
  TO authenticated
  USING (true);