-- Create stories table for Instagram Stories approval workflow
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_image_url TEXT NOT NULL,
  drive_url TEXT,
  caption TEXT NOT NULL,
  titulo_slide TEXT,
  tema TEXT,
  texto_base TEXT,
  idioma TEXT DEFAULT 'pt-PT',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,
  metadata JSONB,
  getlate_post_id TEXT,
  error_log TEXT
);

-- Create indexes for better query performance
CREATE INDEX idx_stories_status ON public.stories(status);
CREATE INDEX idx_stories_created_at ON public.stories(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read all stories
CREATE POLICY "authenticated_read_stories" 
ON public.stories 
FOR SELECT 
TO authenticated
USING (true);

-- RLS Policy: Allow authenticated users to update stories
CREATE POLICY "authenticated_update_stories" 
ON public.stories 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (status IN ('pending', 'approved', 'rejected'));

-- RLS Policy: Allow service role to insert stories
CREATE POLICY "service_insert_stories" 
ON public.stories 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Create validation trigger for status field
CREATE OR REPLACE FUNCTION public.validate_story_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be pending, approved, or rejected';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_story_status_trigger
BEFORE INSERT OR UPDATE ON public.stories
FOR EACH ROW
EXECUTE FUNCTION public.validate_story_status();

-- Create trigger to auto-update reviewed_at when status changes to approved/rejected
CREATE OR REPLACE FUNCTION public.update_story_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    NEW.reviewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_story_reviewed_at_trigger
BEFORE UPDATE ON public.stories
FOR EACH ROW
EXECUTE FUNCTION public.update_story_reviewed_at();