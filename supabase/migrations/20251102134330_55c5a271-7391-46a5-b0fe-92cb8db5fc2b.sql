-- Corrigir search_path na função update_milestones_updated_at com CASCADE
DROP FUNCTION IF EXISTS update_milestones_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public';

-- Recriar o trigger
CREATE TRIGGER trigger_update_milestones_updated_at
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_milestones_updated_at();