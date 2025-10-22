-- Remove caption length validation trigger and function
DROP TRIGGER IF EXISTS trigger_validate_caption_length ON public.posts;
DROP FUNCTION IF EXISTS public.validate_caption_length();