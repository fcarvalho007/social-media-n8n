-- Add scheduled_date column to posts table
ALTER TABLE public.posts 
ADD COLUMN scheduled_date timestamp with time zone;

-- Add scheduled_date column to stories table
ALTER TABLE public.stories 
ADD COLUMN scheduled_date timestamp with time zone;

-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to check and send scheduled posts every minute
SELECT cron.schedule(
  'send-scheduled-posts',
  '* * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://vtmrimrrppuclciolzuw.supabase.co/functions/v1/send-scheduled-posts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0bXJpbXJycHB1Y2xjaW9senV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3ODg3ODQsImV4cCI6MjA3NjM2NDc4NH0.IFNfnEOL7esKqs2ajbR3rwYGLXmD_BRp54MhwgjT8FA"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);