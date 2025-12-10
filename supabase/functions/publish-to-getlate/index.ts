import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Getlate.dev Account IDs (obtained from GET /v1/accounts)
const GETLATE_ACCOUNTS: Record<string, string> = {
  instagram: '68bc4a92b0781fb60ecb403f', // frederico.m.carvalho
  linkedin: '68fb951d8bbca9c10cbfef93',  // Frederico Carvalho
  youtube: '69344efdf43160a0bc99a480',   // fredericocarvalho
  facebook: '69344f55f43160a0bc99a481',  // fredericodigital
  tiktok: '69344fdef43160a0bc99a484',    // frederico.m.carvalho
};

// Map format to base network
const FORMAT_TO_NETWORK: Record<string, string> = {
  // Instagram
  instagram_carousel: 'instagram',
  instagram_image: 'instagram',
  instagram_stories: 'instagram',
  instagram_reel: 'instagram',
  // LinkedIn
  linkedin_post: 'linkedin',
  linkedin_document: 'linkedin',
  // YouTube
  youtube_shorts: 'youtube',
  youtube_video: 'youtube',
  // TikTok
  tiktok_video: 'tiktok',
  // Facebook
  facebook_image: 'facebook',
  facebook_stories: 'facebook',
  facebook_reel: 'facebook',
};

interface PublishPayload {
  format: string;
  caption: string;
  media_urls: string[];
  scheduled_date?: string;
  scheduled_time?: string;
  publish_immediately: boolean;
}

interface GetlatePostPayload {
  content: string;
  scheduledFor?: string;
  timezone: string;
  publishNow?: boolean;
  platforms: Array<{
    platform: string;
    accountId: string;
    platformSpecificData?: {
      contentType?: 'story' | 'reel';
    };
  }>;
  mediaItems?: Array<{
    type: 'image' | 'video' | 'document';
    url: string;
  }>;
}

interface GetlateUsageStats {
  usage: {
    uploads: number;
  };
  limits: {
    uploads: number; // -1 means unlimited
  };
}

// Helper function to detect media type from URL extension
function getMediaTypeFromUrl(url: string): 'image' | 'video' | 'document' {
  const lowercaseUrl = url.toLowerCase();
  // Check for document (PDF)
  if (lowercaseUrl.includes('.pdf')) return 'document';
  // Check for video extensions
  if (lowercaseUrl.match(/\.(mp4|mov|webm|avi|mkv|m4v|quicktime)(\?|$)/)) return 'video';
  // Default to image (PNG, JPG, JPEG, WEBP, GIF, etc.)
  return 'image';
}

// Validate quota directly from Getlate API
async function validateQuotaFromGetlate(apiToken: string): Promise<{ canPublish: boolean; error?: string }> {
  try {
    console.log('[publish-to-getlate] Validating quota from Getlate API...');
    
    const response = await fetch('https://getlate.dev/api/v1/usage-stats', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      console.error(`[publish-to-getlate] Failed to fetch usage stats: ${response.status}`);
      // Allow on error to not block publishing
      return { canPublish: true };
    }

    const stats: GetlateUsageStats = await response.json();
    console.log('[publish-to-getlate] Getlate usage stats:', JSON.stringify(stats));

    // If uploads limit is -1, it's unlimited
    if (stats.limits.uploads === -1) {
      console.log('[publish-to-getlate] ✅ Unlimited plan - quota validated');
      return { canPublish: true };
    }

    // Check if within limit
    if (stats.usage.uploads < stats.limits.uploads) {
      console.log(`[publish-to-getlate] ✅ Quota OK: ${stats.usage.uploads}/${stats.limits.uploads}`);
      return { canPublish: true };
    }

    console.log(`[publish-to-getlate] ❌ Quota exceeded: ${stats.usage.uploads}/${stats.limits.uploads}`);
    return { 
      canPublish: false, 
      error: `Quota Getlate esgotada: ${stats.usage.uploads}/${stats.limits.uploads} uploads` 
    };
  } catch (error) {
    console.error('[publish-to-getlate] Error validating quota from Getlate:', error);
    // Allow on error to not block publishing
    return { canPublish: true };
  }
}

async function publishToGetlate(apiToken: string, payload: GetlatePostPayload, retries = 3): Promise<{ success: boolean; data?: any; error?: string }> {
  const apiUrl = 'https://getlate.dev/api/v1/posts';
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[publish-to-getlate] Attempt ${attempt} - Publishing to Getlate API`);
      console.log(`[publish-to-getlate] Payload:`, JSON.stringify(payload, null, 2));
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseText = await response.text();
      console.log(`[publish-to-getlate] Response status: ${response.status}`);
      console.log(`[publish-to-getlate] Response body: ${responseText}`);

      if (response.ok) {
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { raw: responseText };
        }
        return { success: true, data };
      } else {
        console.error(`[publish-to-getlate] API returned status ${response.status}: ${responseText}`);
        
        if (attempt === retries) {
          return { success: false, error: `Getlate API error (${response.status}): ${responseText}` };
        }
      }
    } catch (error) {
      console.error(`[publish-to-getlate] Attempt ${attempt} failed:`, error);
      
      if (attempt === retries) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
      
      console.log(`[publish-to-getlate] Waiting 2 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return { success: false, error: 'All attempts failed' };
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

    // Get Getlate API token
    const getlateToken = Deno.env.get('GETLATE_API_TOKEN');
    if (!getlateToken) {
      throw new Error('GETLATE_API_TOKEN not configured');
    }

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
    const { format, caption, media_urls, scheduled_date, scheduled_time, publish_immediately } = body as PublishPayload;

    console.log(`[publish-to-getlate] Processing publication for format: ${format}`);

    // Get network from format
    const network = FORMAT_TO_NETWORK[format];
    if (!network) {
      throw new Error(`Invalid or unsupported format: ${format}`);
    }

    // Get account ID for the network
    const accountId = GETLATE_ACCOUNTS[network];
    if (!accountId) {
      throw new Error(`Account not configured for network: ${network}`);
    }

    // Validate quota directly from Getlate API (not local quota_overrides)
    const quotaCheck = await validateQuotaFromGetlate(getlateToken);
    if (!quotaCheck.canPublish) {
      throw new Error(quotaCheck.error || 'Quota Getlate esgotada');
    }

    // For formats that don't require captions (stories), use a space if empty
    // Getlate API requires content to be non-empty
    const contentToSend = caption?.trim() || ' ';

    // Determine platformSpecificData for content type
    const getPlatformSpecificData = (format: string): { contentType?: 'story' | 'reel' } | undefined => {
      if (format.includes('stories')) return { contentType: 'story' };
      if (format.includes('reel') || format.includes('shorts')) return { contentType: 'reel' };
      return undefined; // Regular post doesn't need platformSpecificData
    };

    const platformSpecificData = getPlatformSpecificData(format);

    // Build mediaItems with correct type per individual file (not global format)
    const mediaItems = media_urls.map(url => {
      const mediaType = getMediaTypeFromUrl(url);
      console.log(`[publish-to-getlate] Media: ${url.split('/').pop()} → type: ${mediaType}`);
      return { type: mediaType, url };
    });

    console.log(`[publish-to-getlate] Media breakdown: ${mediaItems.map(m => m.type).join(', ')}`);

    // Build Getlate payload
    const getlatePayload: GetlatePostPayload = {
      content: contentToSend,
      timezone: 'Europe/Lisbon',
      platforms: [{
        platform: network,
        accountId: accountId,
        ...(platformSpecificData && { platformSpecificData }),
      }],
      mediaItems,
    };

    // Add publishNow for immediate publishing, or scheduledFor for scheduled posts
    if (publish_immediately) {
      getlatePayload.publishNow = true;
      console.log(`[publish-to-getlate] Immediate publishing: publishNow=true`);
    } else if (scheduled_date) {
      let scheduledDateTime = scheduled_date;
      if (scheduled_time) {
        // Combine date and time
        scheduledDateTime = `${scheduled_date}T${scheduled_time}:00`;
      }
      getlatePayload.scheduledFor = new Date(scheduledDateTime).toISOString();
      console.log(`[publish-to-getlate] Scheduled for: ${getlatePayload.scheduledFor}`);
    }

    // Publish to Getlate
    const result = await publishToGetlate(getlateToken, getlatePayload);

    if (!result.success) {
      throw new Error(result.error || 'Failed to publish to Getlate');
    }

    // NOTE: We no longer increment local quota - Getlate tracks usage automatically
    console.log(`[publish-to-getlate] ✅ Successfully published to ${network} (Getlate tracks quota automatically)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Publicado com sucesso em ${network}`,
        data: result.data,
        network,
        format,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[publish-to-getlate] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro ao publicar. Tenta novamente.';
    
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
