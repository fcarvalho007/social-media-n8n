import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetlateUsageStats {
  planName?: string;
  plan?: {
    name?: string;
  };
  limits?: {
    uploads: number;
    profiles?: number;
  };
  usage?: {
    uploads?: number;
    profiles?: number;
    lastReset?: string;
  };
  resetDate?: string;
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const getlateToken = Deno.env.get('GETLATE_API_TOKEN');
    if (!getlateToken) {
      throw new Error('GETLATE_API_TOKEN not configured');
    }

    const baseUrl = Deno.env.get('GETLATE_BASE_URL') || 'https://getlate.dev/api';
    
    console.log('Fetching quota from Getlate.dev...');
    
    const response = await fetch(`${baseUrl}/v1/usage-stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getlateToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Getlate API error:', response.status, errorText);
      throw new Error(`Getlate API error: ${response.status} ${errorText}`);
    }

    const stats: GetlateUsageStats = await response.json();
    
    // Log completo da resposta para debug
    console.log('Raw Getlate API response:', JSON.stringify(stats, null, 2));
    
    // Validar estrutura da resposta flexível baseada na RESPOSTA REAL
    console.log('Getlate raw stats structure:', {
      has_planName: !!stats.planName,
      has_plan: !!stats.plan,
      has_usage: !!stats.usage,
      has_limits: !!stats.limits,
      planName: stats.planName,
      planFromPlan: stats.plan?.name,
      uploadsUsage: stats.usage?.uploads,
      uploadsLimit: stats.limits?.uploads,
    });
    
    // Código defensivo para extrair planName baseado na estrutura REAL
    const planName = stats?.planName || stats?.plan?.name || 'Free';
    const resetDate = stats?.resetDate || stats?.usage?.lastReset || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log('Getlate stats received:', {
      plan: planName,
      limits: stats.limits?.uploads,
      uploadsUsed: stats.usage?.uploads,
      // Instagram e LinkedIn não existem na estrutura real
    });

    // Processar limites: -1 significa ilimitado
    const limit = stats.limits?.uploads ?? 5;
    const isUnlimited = limit === -1;
    
    // A API real usa "uploads" para todos os tipos de conteúdo
    const totalUsed = stats.usage?.uploads ?? 0;
    
    // Para a interface, dividimos igual para Instagram e LinkedIn
    const instagramUsed = Math.floor(totalUsed / 2);
    const linkedinUsed = totalUsed - instagramUsed;
    
    const instagramRemaining = isUnlimited ? 999999 : Math.max(0, limit - totalUsed);
    const linkedinRemaining = isUnlimited ? 999999 : Math.max(0, limit - totalUsed);

    const quotaData = {
      instagram: {
        used_count: instagramUsed,
        limit_count: isUnlimited ? -1 : limit,
        remaining: instagramRemaining,
      },
      linkedin: {
        used_count: linkedinUsed,
        limit_count: isUnlimited ? -1 : limit,
        remaining: linkedinRemaining,
      },
      planName,
      resetDate,
      isUnlimited,
    };

    console.log('Returning quota data:', quotaData);

    return new Response(JSON.stringify(quotaData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-getlate-quota:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Retornar 200 com warning em vez de 500 para permitir retry
    return new Response(
      JSON.stringify({ 
        warning: errorMessage,
        // Fallback para dados padrão em caso de erro
        instagram: { used_count: 0, limit_count: 5, remaining: 5 },
        linkedin: { used_count: 0, limit_count: 5, remaining: 5 },
        planName: 'Unknown',
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isUnlimited: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
