-- Remover a constraint mais restritiva que está a bloquear posts com status 'failed' e 'scheduled'
ALTER TABLE posts DROP CONSTRAINT IF EXISTS check_posts_status;

-- Nota: A constraint posts_status_check já permite todos os status necessários:
-- ['draft', 'waiting_for_approval', 'pending', 'approved', 'scheduled', 'published', 'rejected', 'failed']