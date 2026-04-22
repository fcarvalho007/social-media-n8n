-- Eixo E1: Limpar posts órfãos (status='failed' sem error_log) com mais de 30 dias.
-- Não usamos status 'rejected' (não consta da constraint validate_post_status; rejected pertence ao fluxo de stories).
-- Em vez disso, populamos error_log com mensagem clara e garantimos failed_at, mantendo o status para auditoria.
UPDATE public.posts
SET
  error_log = 'Marcado como falhado mas sem registo de erro — arquivado em limpeza de dados (posts órfãos antes de 2026-04-22)',
  failed_at = COALESCE(failed_at, updated_at, created_at, NOW())
WHERE status = 'failed'
  AND error_log IS NULL
  AND created_at < NOW() - INTERVAL '30 days';

-- Eixo E2: Trigger preventivo — sempre que um post passa para status='failed',
-- garante que failed_at é preenchido (evita futuros órfãos sem timestamp).
CREATE OR REPLACE FUNCTION public.set_failed_at_on_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'failed' AND NEW.failed_at IS NULL THEN
    NEW.failed_at := NOW();
  END IF;
  -- Garante também que error_log nunca fica NULL para failed
  IF NEW.status = 'failed' AND (NEW.error_log IS NULL OR NEW.error_log = '') THEN
    NEW.error_log := 'Falha registada sem mensagem específica — verificar publication_attempts';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_failed_at_on_status ON public.posts;
CREATE TRIGGER trg_set_failed_at_on_status
  BEFORE INSERT OR UPDATE OF status ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_failed_at_on_status();