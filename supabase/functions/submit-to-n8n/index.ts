import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All supported formats for approval workflow
type Platform = 
  // Instagram
  | 'instagram_carousel'
  | 'instagram_image'
  | 'instagram_stories'
  | 'instagram_reel'
  // LinkedIn
  | 'linkedin_post'
  | 'linkedin_document'
  | 'linkedin' // Legacy support
  // YouTube
  | 'youtube_shorts'
  | 'youtube_video'
  // TikTok
  | 'tiktok_video'
  // Facebook
  | 'facebook_image'
  | 'facebook_stories'
  | 'facebook_reel';

interface SubmitPayload {
  platform: Platform;
  caption: string;
  media_urls: string[];
  scheduled_date?: string;
  scheduled_time?: string;
  publish_immediately: boolean;
  user_id: string;
  formats?: string[];
}

// Map formats to N8N webhooks
const WEBHOOKS: Record<string, string> = {
  // Instagram - use existing webhooks
  instagram_carousel: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-instagram',
  instagram_image: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-instagram',
  instagram_stories: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-stories',
  instagram_reel: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-instagram',
  // LinkedIn - use existing webhook
  linkedin: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-linkedin',
  linkedin_post: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-linkedin',
  linkedin_document: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-linkedin',
  // YouTube - use Instagram webhook for now (can be updated later)
  youtube_shorts: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-instagram',
  youtube_video: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-instagram',
  // TikTok - use Instagram webhook for now (can be updated later)
  tiktok_video: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-instagram',
  // Facebook - use Instagram webhook for now (can be updated later)
  facebook_image: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-instagram',
  facebook_stories: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-stories',
  facebook_reel: 'https://n8n.srv881120.hstgr.cloud/webhook/aprovacao-instagram',
};

// Map format to base network for quota
const FORMAT_TO_NETWORK: Record<string, 'instagram' | 'linkedin' | 'youtube' | 'tiktok' | 'facebook'> = {
  instagram_carousel: 'instagram',
  instagram_image: 'instagram',
  instagram_stories: 'instagram',
  instagram_reel: 'instagram',
  linkedin: 'linkedin',
  linkedin_post: 'linkedin',
  linkedin_document: 'linkedin',
  youtube_shorts: 'youtube',
  youtube_video: 'youtube',
  tiktok_video: 'tiktok',
  facebook_image: 'facebook',
  facebook_stories: 'facebook',
  facebook_reel: 'facebook',
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
async function validateQuota(supabase: any, userId: string, platform: string): Promise<{ canPublish: boolean; error?: string }> {
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
async function incrementQuota(supabase: any, userId: string, platform: string) {
  try {
    const { data: override } = await supabase
      .from('quota_overrides')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Map platform to field name
    const fieldMap: Record<string, string> = {
      instagram: 'instagram_used',
      linkedin: 'linkedin_used',
      youtube: 'youtube_used',
      facebook: 'facebook_used',
      tiktok: 'tiktok_used',
    };

    const fieldToUpdate = fieldMap[platform] || 'instagram_used';

    if (override) {
      const currentValue = override[fieldToUpdate] || 0;
      await supabase
        .from('quota_overrides')
        .update({ 
          [fieldToUpdate]: currentValue + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    } else {
      const insertData: Record<string, any> = {
        user_id: userId,
        instagram_used: 0,
        linkedin_used: 0,
        instagram_limit: 5,
        linkedin_limit: 5,
      };
      insertData[fieldToUpdate] = 1;
      
      await supabase.from('quota_overrides').insert(insertData);
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
    const validPlatforms = Object.keys(WEBHOOKS);
    if (!validPlatforms.includes(platform)) {
      console.log(`[submit-to-n8n] Invalid platform: ${platform}. Valid platforms: ${validPlatforms.join(', ')}`);
      throw new Error(`Invalid platform: ${platform}`);
    }

    // Validar quota antes de publicar (apenas se publicação imediata)
    if (publish_immediately) {
      const quotaPlatform = FORMAT_TO_NETWORK[platform] || 'instagram';
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
      const quotaPlatform = FORMAT_TO_NETWORK[platform] || 'instagram';
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
