import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmitPayload {
  platform: 'instagram_carousel' | 'instagram_stories' | 'linkedin';
  caption: string;
  media_urls: string[];
  scheduled_date?: string;
  scheduled_time?: string;
  publish_immediately: boolean;
  user_id: string;
}

const WEBHOOKS = {
  instagram_carousel: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-instagram',
  instagram_stories: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-stories',
  linkedin: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-linkedin',
};

async function sendToWebhook(url: string, payload: SubmitPayload, retries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to send to ${url}`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          status: 'pending_approval',
          created_at: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        console.log(`Successfully sent to ${url}`);
        return true;
      } else {
        console.error(`Webhook returned status ${response.status}`);
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt < retries) {
        console.log(`Waiting 2 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  return false;
}

// Função auxiliar para validar quota
async function validateQuota(supabase: any, userId: string, platform: 'instagram' | 'linkedin'): Promise<{ canPublish: boolean; error?: string }> {
  try {
    const { data: override } = await supabase
      .from('quota_overrides')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (override) {
      const used = platform === 'instagram' ? override.instagram_used : override.linkedin_used;
      const limit = platform === 'instagram' ? override.instagram_limit : override.linkedin_limit;
      
      if (limit !== -1 && used >= limit) {
        return { canPublish: false, error: `Quota ${platform} esgotada: ${used}/${limit}` };
      }
    }

    return { canPublish: true };
  } catch (error) {
    console.error('⚠️ Erro ao validar quota:', error);
    return { canPublish: true }; // Permitir em caso de erro
  }
}

// Função auxiliar para incrementar quota
async function incrementQuota(supabase: any, userId: string, platform: 'instagram' | 'linkedin') {
  try {
    const { data: override } = await supabase
      .from('quota_overrides')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const fieldToUpdate = platform === 'instagram' ? 'instagram_used' : 'linkedin_used';

    if (override) {
      await supabase
        .from('quota_overrides')
        .update({ 
          [fieldToUpdate]: override[fieldToUpdate] + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('quota_overrides')
        .insert({
          user_id: userId,
          instagram_used: platform === 'instagram' ? 1 : 0,
          linkedin_used: platform === 'linkedin' ? 1 : 0,
          instagram_limit: 5,
          linkedin_limit: 5,
        });
    }

    console.log(`✅ Quota incrementada: ${platform} para user ${userId}`);
  } catch (error) {
    console.error('⚠️ Erro ao incrementar quota:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { platform, caption, media_urls, scheduled_date, scheduled_time, publish_immediately } = body;

    console.log(`Processing submission for platform: ${platform}`);

    // Validate platform
    if (!['instagram_carousel', 'instagram_stories', 'linkedin'].includes(platform)) {
      throw new Error('Invalid platform');
    }

    // Validar quota antes de publicar (apenas se publicação imediata)
    if (publish_immediately) {
      const quotaPlatform = platform === 'linkedin' ? 'linkedin' : 'instagram';
      const quotaCheck = await validateQuota(supabase, user.id, quotaPlatform);
      
      if (!quotaCheck.canPublish) {
        throw new Error(quotaCheck.error || 'Quota esgotada');
      }
    }

    // Prepare payload
    const payload: SubmitPayload = {
      platform,
      caption,
      media_urls,
      scheduled_date: scheduled_date || null,
      scheduled_time: scheduled_time || null,
      publish_immediately: publish_immediately || false,
      user_id: user.id,
    };

    // Send to appropriate webhook
    const webhookUrl = WEBHOOKS[platform as keyof typeof WEBHOOKS];
    const success = await sendToWebhook(webhookUrl, payload);

    if (!success) {
      throw new Error('Failed to submit to N8N after 3 attempts');
    }

    // Incrementar quota após sucesso (apenas se publicação imediata)
    if (publish_immediately) {
      const quotaPlatform = platform === 'linkedin' ? 'linkedin' : 'instagram';
      await incrementQuota(supabase, user.id, quotaPlatform);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Publicação submetida para aprovação' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in submit-to-n8n:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro ao submeter. Tenta novamente.';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
