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

interface GetlateUsageStats {
  usage: {
    uploads: number;
  };
  limits: {
    uploads: number; // -1 means unlimited
  };
}

// Validate quota directly from Getlate API
async function validateQuotaFromGetlate(apiToken: string): Promise<{ canPublish: boolean; error?: string }> {
  try {
    console.log('[submit-to-n8n] Validating quota from Getlate API...');
    
    const response = await fetch('https://getlate.dev/api/v1/usage-stats', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      console.error(`[submit-to-n8n] Failed to fetch usage stats: ${response.status}`);
      // Allow on error to not block submission
      return { canPublish: true };
    }

    const stats: GetlateUsageStats = await response.json();
    console.log('[submit-to-n8n] Getlate usage stats:', JSON.stringify(stats));

    // If uploads limit is -1, it's unlimited
    if (stats.limits.uploads === -1) {
      console.log('[submit-to-n8n] ✅ Unlimited plan - quota validated');
      return { canPublish: true };
    }

    // Check if within limit
    if (stats.usage.uploads < stats.limits.uploads) {
      console.log(`[submit-to-n8n] ✅ Quota OK: ${stats.usage.uploads}/${stats.limits.uploads}`);
      return { canPublish: true };
    }

    console.log(`[submit-to-n8n] ❌ Quota exceeded: ${stats.usage.uploads}/${stats.limits.uploads}`);
    return { 
      canPublish: false, 
      error: `Quota Getlate esgotada: ${stats.usage.uploads}/${stats.limits.uploads} uploads` 
    };
  } catch (error) {
    console.error('[submit-to-n8n] Error validating quota from Getlate:', error);
    // Allow on error to not block submission
    return { canPublish: true };
  }
}

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

    // Get Getlate API token for quota validation
    const getlateToken = Deno.env.get('GETLATE_API_TOKEN');

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

    // Validate quota from Getlate API (only if publishing immediately and token available)
    if (publish_immediately && getlateToken) {
      const quotaCheck = await validateQuotaFromGetlate(getlateToken);
      
      if (!quotaCheck.canPublish) {
        throw new Error(quotaCheck.error || 'Quota Getlate esgotada');
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

    // NOTE: We no longer increment local quota - Getlate tracks usage automatically
    console.log(`[submit-to-n8n] ✅ Successfully submitted to N8N (Getlate tracks quota automatically)`);

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
