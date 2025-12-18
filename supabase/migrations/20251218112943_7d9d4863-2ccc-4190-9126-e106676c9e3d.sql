-- Create idempotency_keys table for persistent duplicate detection
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key TEXT PRIMARY KEY,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- Index for automatic cleanup queries
CREATE INDEX idx_idempotency_expires ON public.idempotency_keys(expires_at);

-- Enable RLS
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to insert and select (using service role)
CREATE POLICY "Service role full access" ON public.idempotency_keys
  FOR ALL USING (true) WITH CHECK (true);

-- Function to cleanup expired keys (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_keys()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.idempotency_keys WHERE expires_at < NOW();
END;
$$;