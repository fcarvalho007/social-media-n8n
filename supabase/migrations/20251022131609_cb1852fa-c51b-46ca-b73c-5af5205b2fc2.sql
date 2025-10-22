-- Fase 2: Melhorias de Base de Dados
-- 2.1 Adicionar Índices de Performance
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_workflow_id ON posts(workflow_id);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);

-- 2.2 Adicionar Constraints de Validação
-- Remover constraints existentes se existirem
ALTER TABLE posts DROP CONSTRAINT IF EXISTS check_posts_status;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS check_content_type;
ALTER TABLE stories DROP CONSTRAINT IF EXISTS check_stories_status;

-- Adicionar constraints
ALTER TABLE posts 
ADD CONSTRAINT check_posts_status 
CHECK (status IN ('pending', 'approved', 'rejected', 'published'));

ALTER TABLE posts 
ADD CONSTRAINT check_content_type 
CHECK (content_type IN ('carousel', 'post', 'stories'));

ALTER TABLE stories 
ADD CONSTRAINT check_stories_status 
CHECK (status IN ('pending', 'approved', 'rejected', 'published'));