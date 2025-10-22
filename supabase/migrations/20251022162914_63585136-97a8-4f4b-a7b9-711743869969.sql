-- Add missing columns to posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS hashtags_text TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create function to validate template_a_images array length
CREATE OR REPLACE FUNCTION validate_template_a_images()
RETURNS TRIGGER AS $$
BEGIN
  IF array_length(NEW.template_a_images, 1) != 10 THEN
    RAISE EXCEPTION 'template_a_images must have exactly 10 URLs';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate template_b_images array length
CREATE OR REPLACE FUNCTION validate_template_b_images()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_b_images IS NOT NULL AND array_length(NEW.template_b_images, 1) NOT IN (0, 10) THEN
    RAISE EXCEPTION 'template_b_images must have 0 or 10 URLs';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate caption length
CREATE OR REPLACE FUNCTION validate_caption_length()
RETURNS TRIGGER AS $$
BEGIN
  IF length(NEW.caption) < 300 OR length(NEW.caption) > 700 THEN
    RAISE EXCEPTION 'caption must be between 300 and 700 characters';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate status values
CREATE OR REPLACE FUNCTION validate_post_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected', 'published') THEN
    RAISE EXCEPTION 'status must be pending, approved, rejected, or published';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate selected_template values
CREATE OR REPLACE FUNCTION validate_selected_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.selected_template IS NOT NULL AND NEW.selected_template NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'selected_template must be A, B, or NULL';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_validate_template_a_images ON public.posts;
DROP TRIGGER IF EXISTS trigger_validate_template_b_images ON public.posts;
DROP TRIGGER IF EXISTS trigger_validate_caption_length ON public.posts;
DROP TRIGGER IF EXISTS trigger_validate_post_status ON public.posts;
DROP TRIGGER IF EXISTS trigger_validate_selected_template ON public.posts;
DROP TRIGGER IF EXISTS trigger_update_posts_updated_at ON public.posts;

-- Create triggers for validations
CREATE TRIGGER trigger_validate_template_a_images
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION validate_template_a_images();

CREATE TRIGGER trigger_validate_template_b_images
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION validate_template_b_images();

CREATE TRIGGER trigger_validate_caption_length
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION validate_caption_length();

CREATE TRIGGER trigger_validate_post_status
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION validate_post_status();

CREATE TRIGGER trigger_validate_selected_template
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION validate_selected_template();

CREATE TRIGGER trigger_update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION update_posts_updated_at();

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_posts_workflow_id ON public.posts(workflow_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_selected_template ON public.posts(selected_template) WHERE selected_template IS NOT NULL;