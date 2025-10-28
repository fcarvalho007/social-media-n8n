import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetlateUsageStats {
  plan: {
    name: string;
  };
  limits: {
    uploads: number;
  };
  usage: {
    instagram: {
      totalPosts: number;
    };
    linkedin: {
      totalPosts: number;
    };
  };
  resetDate: string;
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
    
    console.log('Getlate stats received:', {
      plan: stats.plan.name,
      limits: stats.limits.uploads,
      instagramUsed: stats.usage.instagram.totalPosts,
      linkedinUsed: stats.usage.linkedin.totalPosts,
    });

    // Processar limites: -1 significa ilimitado
    const limit = stats.limits.uploads;
    const isUnlimited = limit === -1;
    
    const instagramUsed = stats.usage.instagram.totalPosts;
    const linkedinUsed = stats.usage.linkedin.totalPosts;
    
    const instagramRemaining = isUnlimited ? 999999 : Math.max(0, limit - instagramUsed);
    const linkedinRemaining = isUnlimited ? 999999 : Math.max(0, limit - linkedinUsed);

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
      planName: stats.plan.name,
      resetDate: stats.resetDate,
      isUnlimited,
    };

    console.log('Returning quota data:', quotaData);

    return new Response(JSON.stringify(quotaData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-getlate-quota:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        // Fallback para dados padrão em caso de erro
        instagram: { used_count: 0, limit_count: 5, remaining: 5 },
        linkedin: { used_count: 0, limit_count: 5, remaining: 5 },
        planName: 'Unknown',
        isUnlimited: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
