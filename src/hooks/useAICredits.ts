import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AICreditsState {
  credits_remaining: number;
  credits_monthly_allowance: number;
  plan_tier: string;
  last_reset_at: string | null;
}

const fallbackCredits: AICreditsState = {
  credits_remaining: 0,
  credits_monthly_allowance: 0,
  plan_tier: 'free',
  last_reset_at: null,
};

export function useAICredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<AICreditsState>(fallbackCredits);
  const [loading, setLoading] = useState(true);

  const loadCredits = async () => {
    if (!user) {
      setCredits(fallbackCredits);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('user_ai_credits' as any)
      .select('credits_remaining, credits_monthly_allowance, plan_tier, last_reset_at')
      .eq('user_id', user.id)
      .maybeSingle();

    setCredits(data ? (data as unknown as AICreditsState) : fallbackCredits);
    setLoading(false);
  };

  useEffect(() => {
    loadCredits();
  }, [user?.id]);

  return { credits, loading, refresh: loadCredits };
}
