import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncrementQuotaPayload {
  user_id: string;
  platform: 'instagram' | 'linkedin';
  post_id?: string;
}

/**
 * Incrementa o contador de quota para um utilizador e plataforma específicos
 */
export async function incrementQuota(
  supabase: any,
  userId: string,
  platform: 'instagram' | 'linkedin',
  postId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📊 [Increment Quota] User: ${userId}, Platform: ${platform}, Post: ${postId || 'N/A'}`);

    // 1. Verificar se existe quota_override para o utilizador
    const { data: override, error: fetchError } = await supabase
      .from('quota_overrides')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ [Increment Quota] Erro ao buscar override:', fetchError);
      return { success: false, error: fetchError.message };
    }

    const fieldToUpdate = platform === 'instagram' ? 'instagram_used' : 'linkedin_used';

    if (override) {
      // 2. Atualizar quota existente
      const newUsed = override[fieldToUpdate] + 1;
      
      const { error: updateError } = await supabase
        .from('quota_overrides')
        .update({ 
          [fieldToUpdate]: newUsed,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('❌ [Increment Quota] Erro ao atualizar:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log(`✅ [Increment Quota] Atualizado: ${fieldToUpdate} = ${newUsed}`);
    } else {
      // 3. Criar nova entrada de quota
      const newOverride = {
        user_id: userId,
        instagram_used: platform === 'instagram' ? 1 : 0,
        linkedin_used: platform === 'linkedin' ? 1 : 0,
        instagram_limit: 5,
        linkedin_limit: 5,
      };

      const { error: insertError } = await supabase
        .from('quota_overrides')
        .insert(newOverride);

      if (insertError) {
        console.error('❌ [Increment Quota] Erro ao criar override:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log(`✅ [Increment Quota] Criado novo override: ${platform}_used = 1`);
    }

    // 4. Registar em publication_quota
    if (postId) {
      const { error: quotaLogError } = await supabase
        .from('publication_quota')
        .insert({
          user_id: userId,
          platform,
          post_id: postId,
          post_type: 'carousel',
          published_at: new Date().toISOString(),
        });

      if (quotaLogError) {
        console.warn('⚠️ [Increment Quota] Erro ao registar em publication_quota:', quotaLogError);
      }
    }

    return { success: true };

  } catch (error) {
    console.error('❌ [Increment Quota] Erro inesperado:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: IncrementQuotaPayload = await req.json();
    const { user_id, platform, post_id } = body;

    if (!user_id || !platform) {
      throw new Error('user_id e platform são obrigatórios');
    }

    const result = await incrementQuota(supabase, user_id, platform, post_id);

    if (!result.success) {
      throw new Error(result.error || 'Erro ao incrementar quota');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Quota incrementada' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ [Increment Quota Endpoint] Erro:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao incrementar quota'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
