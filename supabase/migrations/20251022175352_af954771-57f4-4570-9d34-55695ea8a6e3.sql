-- Fix search_path for validation functions
CREATE OR REPLACE FUNCTION validate_template_a_images()
RETURNS TRIGGER AS $$
BEGIN
  IF array_length(NEW.template_a_images, 1) != 10 THEN
    RAISE EXCEPTION 'template_a_images must have exactly 10 URLs';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION validate_template_b_images()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_b_images IS NOT NULL AND array_length(NEW.template_b_images, 1) NOT IN (0, 10) THEN
    RAISE EXCEPTION 'template_b_images must have 0 or 10 URLs';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION validate_caption_length()
RETURNS TRIGGER AS $$
BEGIN
  IF length(NEW.caption) < 300 OR length(NEW.caption) > 700 THEN
    RAISE EXCEPTION 'caption must be between 300 and 700 characters';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION validate_post_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected', 'published') THEN
    RAISE EXCEPTION 'status must be pending, approved, rejected, or published';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION validate_selected_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.selected_template IS NOT NULL AND NEW.selected_template NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'selected_template must be A, B, or NULL';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;