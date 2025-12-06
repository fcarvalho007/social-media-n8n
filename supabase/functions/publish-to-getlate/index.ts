import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Getlate.dev Account IDs
const GETLATE_ACCOUNTS: Record<string, string> = {
  instagram: '68fb951d8bbca9c10cbfef93',
  linkedin: 'urn:li:person:ojg2Ri_Otv', // LinkedIn usa memberUrn
  youtube: '69344efdf43160a0bc99a480',
  facebook: '69344f55f43160a0bc99a481',
  tiktok: '69344fdef43160a0bc99a484',
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
  platforms: Array<{
    platform: string;
    accountId: string;
  }>;
  mediaItems?: Array<{
    type: 'image' | 'video';
    url: string;
  }>;
}

async function publishToGetlate(apiToken: string, payload: GetlatePostPayload, retries = 3): Promise<{ success: boolean; data?: any; error?: string }> {
  const apiUrl = 'https://api.getlate.dev/v1/posts';
  
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

// Increment quota for a platform
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

    const fieldToUpdate = fieldMap[platform];
    if (!fieldToUpdate) {
      console.warn(`[publish-to-getlate] Unknown platform for quota: ${platform}`);
      return;
    }

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
      // Create new quota record with default limits
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

    console.log(`[publish-to-getlate] ✅ Quota incremented: ${platform} for user ${userId}`);
  } catch (error) {
    console.error('[publish-to-getlate] ⚠️ Error incrementing quota:', error);
  }
}

// Validate quota for a platform
async function validateQuota(supabase: any, userId: string, platform: string): Promise<{ canPublish: boolean; error?: string }> {
  try {
    const { data: override } = await supabase
      .from('quota_overrides')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (override) {
      const fieldMap: Record<string, { used: string; limit: string }> = {
        instagram: { used: 'instagram_used', limit: 'instagram_limit' },
        linkedin: { used: 'linkedin_used', limit: 'linkedin_limit' },
        youtube: { used: 'youtube_used', limit: 'youtube_limit' },
        facebook: { used: 'facebook_used', limit: 'facebook_limit' },
        tiktok: { used: 'tiktok_used', limit: 'tiktok_limit' },
      };

      const fields = fieldMap[platform];
      if (fields) {
        const used = override[fields.used] || 0;
        const limit = override[fields.limit] ?? 5; // Default to 5 if not set
        
        if (limit !== -1 && used >= limit) {
          return { canPublish: false, error: `Quota ${platform} esgotada: ${used}/${limit}` };
        }
      }
    }

    return { canPublish: true };
  } catch (error) {
    console.error('[publish-to-getlate] ⚠️ Error validating quota:', error);
    return { canPublish: true }; // Allow on error
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

    // Validate quota
    const quotaCheck = await validateQuota(supabase, user.id, network);
    if (!quotaCheck.canPublish) {
      throw new Error(quotaCheck.error || 'Quota esgotada');
    }

    // Determine media type based on format
    const isVideoFormat = format.includes('reel') || format.includes('video') || format.includes('shorts') || format === 'tiktok_video';
    const mediaType: 'image' | 'video' = isVideoFormat ? 'video' : 'image';

    // Build Getlate payload
    const getlatePayload: GetlatePostPayload = {
      content: caption,
      timezone: 'Europe/Lisbon',
      platforms: [{
        platform: network,
        accountId: accountId,
      }],
      mediaItems: media_urls.map(url => ({
        type: mediaType,
        url,
      })),
    };

    // Add scheduling if not immediate
    if (!publish_immediately && scheduled_date) {
      let scheduledDateTime = scheduled_date;
      if (scheduled_time) {
        // Combine date and time
        scheduledDateTime = `${scheduled_date}T${scheduled_time}:00`;
      }
      getlatePayload.scheduledFor = new Date(scheduledDateTime).toISOString();
    }

    // Publish to Getlate
    const result = await publishToGetlate(getlateToken, getlatePayload);

    if (!result.success) {
      throw new Error(result.error || 'Failed to publish to Getlate');
    }

    // Increment quota on success
    await incrementQuota(supabase, user.id, network);

    console.log(`[publish-to-getlate] ✅ Successfully published to ${network}`);

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
