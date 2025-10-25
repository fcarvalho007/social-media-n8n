-- Drop triggers first (before dropping functions)
DROP TRIGGER IF EXISTS trigger_validate_template_a_images ON posts;
DROP TRIGGER IF EXISTS trigger_validate_template_b_images ON posts;
DROP TRIGGER IF EXISTS validate_template_a_images_trigger ON posts;
DROP TRIGGER IF EXISTS validate_template_b_images_trigger ON posts;

-- Now drop the functions
DROP FUNCTION IF EXISTS validate_template_a_images() CASCADE;
DROP FUNCTION IF EXISTS validate_template_b_images() CASCADE;

-- Create new flexible validation for template_a_images (1-10 images)
CREATE OR REPLACE FUNCTION public.validate_template_a_images()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.template_a_images IS NOT NULL THEN
    IF array_length(NEW.template_a_images, 1) < 1 OR array_length(NEW.template_a_images, 1) > 10 THEN
      RAISE EXCEPTION 'template_a_images must have between 1 and 10 URLs';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create new flexible validation for template_b_images (0 or 1-10 images)
CREATE OR REPLACE FUNCTION public.validate_template_b_images()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.template_b_images IS NOT NULL THEN
    IF array_length(NEW.template_b_images, 1) IS NOT NULL AND 
       (array_length(NEW.template_b_images, 1) < 1 OR array_length(NEW.template_b_images, 1) > 10) THEN
      RAISE EXCEPTION 'template_b_images must have between 1 and 10 URLs';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Recreate triggers with correct names
CREATE TRIGGER trigger_validate_template_a_images
BEFORE INSERT OR UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION validate_template_a_images();

CREATE TRIGGER trigger_validate_template_b_images
BEFORE INSERT OR UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION validate_template_b_images();