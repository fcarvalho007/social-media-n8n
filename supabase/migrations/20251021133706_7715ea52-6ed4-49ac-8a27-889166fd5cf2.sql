-- Fix security warnings: Add search_path to functions

-- Update validate_story_status function with search_path
CREATE OR REPLACE FUNCTION public.validate_story_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be pending, approved, or rejected';
  END IF;
  RETURN NEW;
END;
$$;

-- Update update_story_reviewed_at function with search_path
CREATE OR REPLACE FUNCTION public.update_story_reviewed_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    NEW.reviewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;