import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FAL_API_URL = 'https://queue.fal.run';

// Map aspect ratios to fal.ai image_size
function mapAspectRatioToImageSize(aspectRatio: string): string {
  const mapping: Record<string, string> = {
    '1:1': '1024x1024',
    '3:4': '1024x1536',
    '4:3': '1536x1024',
    '9:16': '1024x1536',
    '16:9': '1536x1024',
  };
  return mapping[aspectRatio] || '1024x1024';
}

interface GenerateRequest {
  action: 'generate' | 'ping';
  prompt: string;
  aspectRatio?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FAL_KEY = Deno.env.get('FAL_KEY');
    
    const { action, prompt, aspectRatio = '1:1' } = await req.json() as GenerateRequest;

    // Ping action for health check
    if (action === 'ping') {
      return new Response(
        JSON.stringify({ 
          success: !!FAL_KEY, 
          configured: !!FAL_KEY,
          message: FAL_KEY ? 'FAL_KEY configured' : 'FAL_KEY not configured'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!FAL_KEY) {
      console.error('[fal-generate-image] FAL_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'FAL_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!prompt) {
      return new Response(
        JSON.stringify({ success: false, error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fal-generate-image] Starting generation with prompt: ${prompt.substring(0, 100)}...`);
    console.log(`[fal-generate-image] Aspect ratio: ${aspectRatio}`);

    const imageSize = mapAspectRatioToImageSize(aspectRatio);
    console.log(`[fal-generate-image] Mapped to image_size: ${imageSize}`);

    // Submit job to fal.ai
    const submitUrl = `${FAL_API_URL}/fal-ai/gpt-image-1`;
    console.log(`[fal-generate-image] Submitting to: ${submitUrl}`);

    const submitResponse = await fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_size: imageSize,
        quality: 'high',
        num_images: 1,
        output_format: 'png',
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error(`[fal-generate-image] Submit failed: ${submitResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `fal.ai error: ${errorText}` }),
        { status: submitResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const submitData = await submitResponse.json();
    console.log(`[fal-generate-image] Submit response:`, JSON.stringify(submitData));

    // Check if we got immediate result (sync mode) or need to poll
    if (submitData.images && submitData.images.length > 0) {
      // Immediate result
      const imageUrl = submitData.images[0].url;
      console.log(`[fal-generate-image] Got immediate result: ${imageUrl}`);
      return new Response(
        JSON.stringify({ success: true, imageUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Need to poll for result
    const requestId = submitData.request_id;
    if (!requestId) {
      console.error('[fal-generate-image] No request_id in response');
      return new Response(
        JSON.stringify({ success: false, error: 'No request_id received from fal.ai' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fal-generate-image] Got request_id: ${requestId}, starting polling...`);

    // Poll for result (max 60 seconds)
    const maxAttempts = 30;
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusUrl = `${FAL_API_URL}/fal-ai/gpt-image-1/requests/${requestId}/status`;
      console.log(`[fal-generate-image] Polling attempt ${attempt + 1}/${maxAttempts}`);

      const statusResponse = await fetch(statusUrl, {
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        console.error(`[fal-generate-image] Status check failed: ${statusResponse.status}`);
        continue;
      }

      const statusData = await statusResponse.json();
      console.log(`[fal-generate-image] Status: ${statusData.status}`);

      if (statusData.status === 'COMPLETED') {
        // Fetch the result
        const resultUrl = `${FAL_API_URL}/fal-ai/gpt-image-1/requests/${requestId}`;
        const resultResponse = await fetch(resultUrl, {
          headers: {
            'Authorization': `Key ${FAL_KEY}`,
          },
        });

        if (!resultResponse.ok) {
          const errorText = await resultResponse.text();
          console.error(`[fal-generate-image] Result fetch failed: ${errorText}`);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to fetch result' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const resultData = await resultResponse.json();
        console.log(`[fal-generate-image] Result data:`, JSON.stringify(resultData));

        if (resultData.images && resultData.images.length > 0) {
          const imageUrl = resultData.images[0].url;
          console.log(`[fal-generate-image] Success! Image URL: ${imageUrl}`);
          return new Response(
            JSON.stringify({ success: true, imageUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: 'No images in result' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (statusData.status === 'FAILED') {
        console.error(`[fal-generate-image] Job failed:`, statusData);
        return new Response(
          JSON.stringify({ success: false, error: statusData.error || 'Generation failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Timeout
    console.error('[fal-generate-image] Timeout waiting for result');
    return new Response(
      JSON.stringify({ success: false, error: 'Timeout waiting for image generation' }),
      { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fal-generate-image] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
