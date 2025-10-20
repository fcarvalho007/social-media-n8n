-- Add content_type column to posts table
ALTER TABLE public.posts 
ADD COLUMN content_type text DEFAULT 'carousel' CHECK (content_type IN ('carousel', 'stories', 'post'));

-- Add comment to explain the column
COMMENT ON COLUMN public.posts.content_type IS 'Type of Instagram content: carousel (multiple slides), stories (vertical content), or post (single image)';

-- Update existing posts to have carousel as default
UPDATE public.posts SET content_type = 'carousel' WHERE content_type IS NULL;