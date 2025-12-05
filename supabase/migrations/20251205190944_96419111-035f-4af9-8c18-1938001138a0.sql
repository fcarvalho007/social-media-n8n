-- Create saved_captions table for storing reusable caption templates
CREATE TABLE public.saved_captions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'geral',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.saved_captions ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only manage their own captions
CREATE POLICY "Users can view their own saved captions"
ON public.saved_captions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved captions"
ON public.saved_captions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved captions"
ON public.saved_captions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved captions"
ON public.saved_captions FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_saved_captions_updated_at
BEFORE UPDATE ON public.saved_captions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();