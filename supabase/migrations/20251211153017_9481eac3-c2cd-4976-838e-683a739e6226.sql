-- Add fields for failed publication tracking to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS error_log text,
ADD COLUMN IF NOT EXISTS failed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS recovery_token uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;

-- Create index for recovery token lookups
CREATE INDEX IF NOT EXISTS idx_posts_recovery_token ON public.posts(recovery_token);

-- Create index for failed posts queries
CREATE INDEX IF NOT EXISTS idx_posts_status_failed ON public.posts(status) WHERE status = 'failed';

-- Create publication_attempts table for tracking all attempts
CREATE TABLE IF NOT EXISTS public.publication_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  format text,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  response_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on publication_attempts
ALTER TABLE public.publication_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for publication_attempts
CREATE POLICY "Users can view their own publication attempts"
ON public.publication_attempts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = publication_attempts.post_id 
    AND (posts.user_id = auth.uid() OR posts.user_id IS NULL)
  )
);

CREATE POLICY "System can insert publication attempts"
ON public.publication_attempts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update publication attempts"
ON public.publication_attempts
FOR UPDATE
USING (true);

-- Add realtime for publication_attempts
ALTER PUBLICATION supabase_realtime ADD TABLE public.publication_attempts;