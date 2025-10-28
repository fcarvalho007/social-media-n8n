-- Create quota_overrides table for manual quota management
CREATE TABLE IF NOT EXISTS public.quota_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instagram_used INTEGER NOT NULL DEFAULT 0,
  instagram_limit INTEGER NOT NULL DEFAULT 5,
  linkedin_used INTEGER NOT NULL DEFAULT 0,
  linkedin_limit INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quota_overrides_user_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.quota_overrides ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own quota overrides"
ON public.quota_overrides
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quota overrides"
ON public.quota_overrides
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quota overrides"
ON public.quota_overrides
FOR UPDATE
USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger
DROP TRIGGER IF EXISTS trg_quota_overrides_updated_at ON public.quota_overrides;
CREATE TRIGGER trg_quota_overrides_updated_at
BEFORE UPDATE ON public.quota_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();