-- Create scheduled_jobs table for tracking scheduled publications
CREATE TABLE public.scheduled_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL DEFAULT 'post' CHECK (job_type IN ('post', 'story')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'requires_attention')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  error_log JSONB DEFAULT '[]'::jsonb,
  webhook_url TEXT,
  payload JSONB,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT check_post_or_story CHECK (
    (post_id IS NOT NULL AND story_id IS NULL) OR 
    (post_id IS NULL AND story_id IS NOT NULL)
  )
);

-- Add indexes for efficient queries
CREATE INDEX idx_scheduled_jobs_status ON public.scheduled_jobs(status);
CREATE INDEX idx_scheduled_jobs_scheduled_for ON public.scheduled_jobs(scheduled_for);
CREATE INDEX idx_scheduled_jobs_next_retry ON public.scheduled_jobs(next_retry_at) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_scheduled_jobs_post_id ON public.scheduled_jobs(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_scheduled_jobs_story_id ON public.scheduled_jobs(story_id) WHERE story_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_jobs_updated_at
  BEFORE UPDATE ON public.scheduled_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own scheduled jobs" 
  ON public.scheduled_jobs 
  FOR SELECT 
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM posts WHERE posts.id = scheduled_jobs.post_id AND (posts.user_id = auth.uid() OR posts.user_id IS NULL)) OR
    TRUE -- Stories don't have user_id, allow viewing for now
  );

CREATE POLICY "Users can insert their own scheduled jobs" 
  ON public.scheduled_jobs 
  FOR INSERT 
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "Users can update their own scheduled jobs" 
  ON public.scheduled_jobs 
  FOR UPDATE 
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM posts WHERE posts.id = scheduled_jobs.post_id AND (posts.user_id = auth.uid() OR posts.user_id IS NULL)) OR
    TRUE
  );

CREATE POLICY "System can manage all scheduled jobs" 
  ON public.scheduled_jobs 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Function to calculate next retry time with exponential backoff
CREATE OR REPLACE FUNCTION public.calculate_next_retry(attempts INTEGER)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Exponential backoff: 1min, 5min, 15min
  CASE attempts
    WHEN 1 THEN RETURN now() + INTERVAL '1 minute';
    WHEN 2 THEN RETURN now() + INTERVAL '5 minutes';
    ELSE RETURN now() + INTERVAL '15 minutes';
  END CASE;
END;
$$;

-- Function to create notification when scheduled job completes or fails
CREATE OR REPLACE FUNCTION public.notify_scheduled_job_result()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
  v_entity_type TEXT;
  v_entity_id UUID;
BEGIN
  -- Only trigger on status changes to completed, failed, or requires_attention
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  IF NEW.status NOT IN ('completed', 'failed', 'requires_attention') THEN
    RETURN NEW;
  END IF;
  
  -- Get user_id based on job type
  IF NEW.job_type = 'post' AND NEW.post_id IS NOT NULL THEN
    SELECT user_id INTO v_user_id FROM posts WHERE id = NEW.post_id;
    v_entity_type := 'post';
    v_entity_id := NEW.post_id;
  ELSIF NEW.job_type = 'story' AND NEW.story_id IS NOT NULL THEN
    v_user_id := NEW.created_by;
    v_entity_type := 'story';
    v_entity_id := NEW.story_id;
  END IF;
  
  -- Skip if no user_id
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Set notification content based on status
  IF NEW.status = 'completed' THEN
    v_title := 'Publicação agendada concluída';
    v_message := 'A sua publicação agendada foi publicada com sucesso.';
    v_type := 'success';
  ELSIF NEW.status = 'failed' THEN
    v_title := 'Falha na publicação agendada';
    v_message := 'A publicação agendada falhou. Tentativas: ' || NEW.attempts || '/' || NEW.max_attempts;
    v_type := 'warning';
  ELSIF NEW.status = 'requires_attention' THEN
    v_title := 'Publicação requer atenção';
    v_message := 'A publicação agendada falhou após ' || NEW.max_attempts || ' tentativas e requer a sua atenção.';
    v_type := 'error';
  END IF;
  
  -- Insert notification
  INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
  VALUES (v_user_id, v_title, v_message, v_type, v_entity_type, v_entity_id);
  
  RETURN NEW;
END;
$$;

-- Create trigger for notifications
CREATE TRIGGER scheduled_job_notification_trigger
  AFTER UPDATE ON public.scheduled_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_scheduled_job_result();