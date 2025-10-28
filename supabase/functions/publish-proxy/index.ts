import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platform, ...payload } = await req.json();

    console.log(`[publish-proxy] Publishing to ${platform}`, {
      post_id: payload.post_id,
      imageCount: payload.images?.length || 0,
      hasCaption: !!payload.caption_final,
      hasBody: !!payload.body_final,
    });
    
    // Log all image URLs for debugging
    console.log(`[publish-proxy] Images to publish (${payload.images?.length || 0}):`, payload.images);
    
    // Warning if Instagram receives >10 images (should be blocked by frontend)
    if (platform === 'instagram' && payload.images?.length > 10) {
      console.error(`[publish-proxy] WARNING: Instagram received ${payload.images.length} images (max 10). Frontend validation failed!`);
    }

    // Validate payload
    if (!platform || !['instagram', 'linkedin'].includes(platform)) {
      console.error('[publish-proxy] Invalid platform:', platform);
      return new Response(
        JSON.stringify({ error: 'Invalid platform. Must be instagram or linkedin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.images || !Array.isArray(payload.images) || payload.images.length === 0) {
      console.error('[publish-proxy] Invalid images array:', payload.images);
      return new Response(
        JSON.stringify({ error: 'Images array is required and must have at least 1 URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate all image URLs
    const invalidUrls = payload.images.filter((url: string) => 
      !url || typeof url !== 'string' || !url.startsWith('https://')
    );
    
    if (invalidUrls.length > 0) {
      console.error('[publish-proxy] Invalid image URLs found:', invalidUrls);
      return new Response(
        JSON.stringify({ error: 'All image URLs must be valid HTTPS URLs', invalidUrls }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get webhook URL and secret from environment
    const webhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET');
    const webhookUrl = platform === 'instagram' 
      ? Deno.env.get('N8N_INSTAGRAM_WEBHOOK_URL')
      : Deno.env.get('N8N_LINKEDIN_WEBHOOK_URL');

    if (!webhookSecret || !webhookUrl) {
      console.error('[publish-proxy] Missing environment variables:', {
        hasSecret: !!webhookSecret,
        hasUrl: !!webhookUrl,
        platform
      });
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing webhook credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[publish-proxy] Calling ${platform} webhook:`, webhookUrl);

    // Forward to n8n webhook with secret
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log(`[publish-proxy] ${platform} webhook response:`, {
      status: response.status,
      statusText: response.statusText,
      bodyPreview: responseText.substring(0, 200),
    });

    if (!response.ok) {
      console.error(`[publish-proxy] ${platform} webhook failed:`, {
        status: response.status,
        body: responseText,
      });
      return new Response(
        JSON.stringify({ 
          error: `Webhook failed with status ${response.status}`,
          details: responseText,
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      // If response is not JSON, wrap it
      result = { message: responseText };
    }

    console.log(`[publish-proxy] ${platform} publish successful`);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[publish-proxy] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
