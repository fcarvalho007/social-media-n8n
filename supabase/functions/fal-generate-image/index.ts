import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FAL_API_URL = 'https://queue.fal.run';

// Pricing tables (as of Dec 2024)
const NANO_BANANA_PRICING: Record<string, number> = {
  '1K': 0.15,
  '2K': 0.15,
  '4K': 0.30,
};

const GPT_IMAGE_PRICING: Record<string, Record<string, number>> = {
  low: { '1024x1024': 0.009, '1536x1024': 0.013, '1024x1536': 0.013 },
  medium: { '1024x1024': 0.034, '1536x1024': 0.050, '1024x1536': 0.051 },
  high: { '1024x1024': 0.133, '1536x1024': 0.199, '1024x1536': 0.200 },
};

// Map aspect ratio to fal.ai format for Nano Banana Pro
function mapAspectRatioForNanoBanana(aspectRatio: string): string {
  // Nano Banana Pro accepts aspect ratios in "width:height" format
  return aspectRatio;
}

// Map resolution to fal.ai format for Nano Banana Pro
// Note: fal.ai expects UPPERCASE values: '1K', '2K', '4K'
function mapResolution(resolution: string): string {
  const validResolutions = ['1K', '2K', '4K'];
  const upperRes = resolution.toUpperCase();
  return validResolutions.includes(upperRes) ? upperRes : '2K';  // Default to 2K
}

interface GenerateRequest {
  action: 'generate' | 'ping';
  modelId?: 'nano-banana-pro' | 'gpt-image-1.5';
  prompt?: string;
  // Nano Banana Pro params
  aspectRatio?: string;
  resolution?: '1K' | '2K' | '4K';
  // GPT Image 1.5 params  
  imageSize?: string;
  quality?: 'low' | 'medium' | 'high';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FAL_KEY = Deno.env.get('FAL_KEY');
    
    const { 
      action, 
      modelId = 'gpt-image-1.5', 
      prompt, 
      aspectRatio = '1:1',
      resolution = '1K',
      imageSize = '1024x1024',
      quality = 'high',
    } = await req.json() as GenerateRequest;

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

    console.log(`[fal-generate-image] Model: ${modelId}`);
    console.log(`[fal-generate-image] Prompt: ${prompt.substring(0, 100)}...`);

    let submitUrl: string;
    let requestBody: Record<string, unknown>;
    let estimatedCost: number;

    if (modelId === 'nano-banana-pro') {
      // Nano Banana Pro
      submitUrl = `${FAL_API_URL}/fal-ai/nano-banana-pro`;
      const mappedResolution = mapResolution(resolution);
      requestBody = {
        prompt,
        aspect_ratio: mapAspectRatioForNanoBanana(aspectRatio),
        resolution: mappedResolution,  // CORRECTED: was output_resolution
        num_images: 1,
        output_format: 'png',
      };
      estimatedCost = NANO_BANANA_PRICING[resolution] || 0.15;
      
      console.log(`[fal-generate-image] Nano Banana Pro - Aspect: ${aspectRatio}, Resolution: ${resolution} -> ${mappedResolution}`);
    } else {
      // GPT Image 1.5
      submitUrl = `${FAL_API_URL}/fal-ai/gpt-image-1`;
      requestBody = {
        prompt,
        image_size: imageSize,
        quality,
        num_images: 1,
        output_format: 'png',
      };
      estimatedCost = GPT_IMAGE_PRICING[quality]?.[imageSize] || 0.133;
      
      console.log(`[fal-generate-image] GPT Image 1.5 - Size: ${imageSize}, Quality: ${quality}`);
    }

    console.log(`[fal-generate-image] Estimated cost: $${estimatedCost}`);
    console.log(`[fal-generate-image] Submitting to: ${submitUrl}`);

    const submitResponse = await fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
      const imageUrl = submitData.images[0].url;
      console.log(`[fal-generate-image] Got immediate result: ${imageUrl}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          imageUrl,
          cost: estimatedCost,
        }),
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

    // Determine the model path for polling
    const modelPath = modelId === 'nano-banana-pro' ? 'fal-ai/nano-banana-pro' : 'fal-ai/gpt-image-1';

    // Poll for result (max 120 seconds for larger resolutions)
    const maxAttempts = 60;
    const pollInterval = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusUrl = `${FAL_API_URL}/${modelPath}/requests/${requestId}/status`;
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
        const resultUrl = `${FAL_API_URL}/${modelPath}/requests/${requestId}`;
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
            JSON.stringify({ 
              success: true, 
              imageUrl,
              cost: estimatedCost,
            }),
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
