import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AICreditsState {
  credits_remaining: number;
  credits_monthly_allowance: number;
  plan_tier: string;
  last_reset_at: string | null;
}
const fallbackCredits: AICreditsState = {credits_remaining:0,credits_monthly_allowance:0,plan_tier:'free',last_reset_at:null};

export function useAICredits() {
  const {user} = useAuth();
  const userId = user?.id ?? null;
  const q = useQuery({queryKey:['ai-credits',userId],enabled:!!userId,retry:false,
    queryFn:async () => {
      const {data,error} = await supabase.from('user_ai_credits')
        .select('credits_remaining, credits_monthly_allowance, plan_tier, last_reset_at').eq('user_id',userId!).maybeSingle();
      if(error) throw error;
      return data ? data as AICreditsState : fallbackCredits;
    },
  });
  return {credits:q.data ?? fallbackCredits,loading:q.isLoading,error:q.error,refresh:q.refetch};
}
