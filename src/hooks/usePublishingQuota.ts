import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface QuotaUsage {
  used_count: number;
  limit_count: number;
  remaining: number;
}

interface GetlateQuotaResponse {
  instagram: QuotaUsage;
  linkedin: QuotaUsage;
  planName: string;
  resetDate: string;
  isUnlimited: boolean;
  warning?: string;
  source?: 'override' | 'getlate';
}

export function usePublishingQuota() {
  const { user } = useAuth();

  // Query que verifica primeiro quota_overrides, depois Getlate.dev
  const quotaQuery = useQuery({
    queryKey: ['publishing-quota', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // 1. Verificar se existe quota override personalizada
      try {
        const { data: override, error: overrideError } = await supabase
          .from('quota_overrides')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (overrideError && overrideError.code !== 'PGRST116') {
          console.warn('[Quota] Erro ao verificar override:', overrideError);
        }

        if (override) {
          console.log('[Quota] Usando quota personalizada:', override);
          return {
            instagram: {
              used_count: override.instagram_used,
              limit_count: override.instagram_limit,
              remaining: Math.max(0, override.instagram_limit - override.instagram_used),
            },
            linkedin: {
              used_count: override.linkedin_used,
              limit_count: override.linkedin_limit,
              remaining: Math.max(0, override.linkedin_limit - override.linkedin_used),
            },
            planName: 'Quota Personalizada',
            resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            isUnlimited: false,
            source: 'override',
          };
        }
      } catch (err) {
        console.warn('[Quota] Falha ao verificar override, usando Getlate.dev:', err);
      }

      // 2. Se não existe override, usar Getlate.dev
      console.log('[Quota] Usando quota do Getlate.dev...');
      
      const { data, error } = await supabase.functions.invoke<GetlateQuotaResponse>('get-getlate-quota');

      if (error) {
        console.error('[Quota] Erro Getlate.dev:', error);
        throw error;
      }
      
      console.log('[Quota] Recebido do Getlate.dev:', data);
      
      // Validar dados recebidos
      if (data?.warning) {
        console.warn('[Quota] API retornou warning:', data.warning);
      }
      
      return { ...data, source: 'getlate' };
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    staleTime: 15000, // Cache de 15 segundos
  });

  const formatQuotaText = (used: number, limit: number) => {
    if (limit === -1) return `${used}/∞`;
    return `${used}/${limit}`;
  };

  const calculatePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Ilimitado = sem barra de progresso
    return limit > 0 ? (used / limit) * 100 : 0;
  };

  const defaultQuota: QuotaUsage = { used_count: 0, limit_count: 5, remaining: 5 };

  return {
    instagram: {
      quota: quotaQuery.data?.instagram || defaultQuota,
      quotaText: quotaQuery.data?.instagram 
        ? formatQuotaText(quotaQuery.data.instagram.used_count, quotaQuery.data.instagram.limit_count)
        : '0/5',
      canPublish: quotaQuery.data?.instagram 
        ? (quotaQuery.data.instagram.limit_count === -1 || quotaQuery.data.instagram.remaining > 0)
        : false,
      isLoading: quotaQuery.isLoading,
      percentage: quotaQuery.data?.instagram 
        ? calculatePercentage(quotaQuery.data.instagram.used_count, quotaQuery.data.instagram.limit_count)
        : 0,
    },
    linkedin: {
      quota: quotaQuery.data?.linkedin || defaultQuota,
      quotaText: quotaQuery.data?.linkedin 
        ? formatQuotaText(quotaQuery.data.linkedin.used_count, quotaQuery.data.linkedin.limit_count)
        : '0/5',
      canPublish: quotaQuery.data?.linkedin 
        ? (quotaQuery.data.linkedin.limit_count === -1 || quotaQuery.data.linkedin.remaining > 0)
        : false,
      isLoading: quotaQuery.isLoading,
      percentage: quotaQuery.data?.linkedin 
        ? calculatePercentage(quotaQuery.data.linkedin.used_count, quotaQuery.data.linkedin.limit_count)
        : 0,
    },
    planName: quotaQuery.data?.planName || 'Unknown',
    isUnlimited: quotaQuery.data?.isUnlimited || false,
    refetch: () => quotaQuery.refetch(),
  };
}
