-- Atualizar a função de validação de status para incluir 'scheduled'
CREATE OR REPLACE FUNCTION public.validate_post_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected', 'published', 'publishing', 'scheduled', 'waiting_for_approval', 'failed') THEN
    RAISE EXCEPTION 'status must be pending, approved, rejected, published, publishing, scheduled, waiting_for_approval, or failed';
  END IF;
  RETURN NEW;
END;
$$;