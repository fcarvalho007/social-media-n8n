import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HIGGSFIELD_API_URL = 'https://platform.higgsfield.ai';

// Model aliases to try - multiple variants for each model
// nano-banana-pro REQUIRES resolution: 1k, 2k, or 4k (not 720p/1080p)
const MODEL_ALIASES: Record<string, string[]> = {
  'google/nano-banana-pro': [
    'nano-banana-pro',  // This one works! Requires resolution 1k/2k/4k
    'nano-banana-2',
    'google/nano-banana-pro',
    'google/nano-banana-2',
    'google/gemini-2.0-flash-exp',
    'google/gemini-3-pro-image'
  ],
  'openai/gpt-image-1.5': [
    'gpt-image-1',
    'openai/gpt-image-1',
    'gpt-image-1-5',
    'openai/gpt-image-1-5',
    'gpt-image',
    'openai/gpt-image',
    'hazelnut',
    'openai/hazelnut',
    'openai/hazel',
    'openai/gpt-4o-image'
  ],
  'higgsfield-ai/soul/standard': [
    'higgsfield-ai/soul/standard'
  ]
};

// Resolution mapping per model - nano-banana-pro only accepts 1k, 2k, 4k
const MODEL_RESOLUTION_MAP: Record<string, Record<string, string>> = {
  'nano-banana-pro': {
    '720p': '1k',
    '1080p': '1k',
    '4k': '4k',
    '1k': '1k',
    '2k': '2k'
  },
  'nano-banana-2': {
    '720p': '1k',
    '1080p': '1k',
    '4k': '4k',
    '1k': '1k',
    '2k': '2k'
  }
};

// Get the correct resolution for a model
function getResolutionForModel(modelVariant: string, requestedResolution: string): string {
  const mapping = MODEL_RESOLUTION_MAP[modelVariant];
  if (mapping && mapping[requestedResolution]) {
    return mapping[requestedResolution];
  }
  return requestedResolution; // Default: use as-is
}

interface GenerateRequest {
  action: 'generate' | 'status' | 'cancel' | 'ping';
  prompt?: string;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  requestId?: string;
}

// Try multiple model variants until one works
async function tryModelVariants(
  modelId: string,
  authHeader: string,
  baseRequestBody: { prompt: string; aspect_ratio: string; resolution: string }
): Promise<{ response: Response; usedModelId: string; clonedResponse: Response } | null> {
  const variants = MODEL_ALIASES[modelId] || [modelId];
  
  console.log(`[Higgsfield] Starting model variant testing for: ${modelId}`);
  console.log(`[Higgsfield] Will try ${variants.length} variants: ${variants.join(', ')}`);
  console.log(`[Higgsfield] Original resolution: ${baseRequestBody.resolution}`);
  
  for (const variant of variants) {
    // Get the correct resolution for this model variant
    const resolution = getResolutionForModel(variant, baseRequestBody.resolution);
    const requestBody = {
      ...baseRequestBody,
      resolution
    };
    
    const url = `${HIGGSFIELD_API_URL}/${variant}`;
    console.log(`[Higgsfield] ----------------------------------------`);
    console.log(`[Higgsfield] Trying model variant: ${variant}`);
    console.log(`[Higgsfield] Resolution mapped: ${baseRequestBody.resolution} → ${resolution}`);
    console.log(`[Higgsfield] Full URL: ${url}`);
    console.log(`[Higgsfield] Request body: ${JSON.stringify(requestBody)}`);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log(`[Higgsfield] Response status for ${variant}: ${response.status}`);
      console.log(`[Higgsfield] Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
      
      // Clone response before reading body
      const clonedResponse = response.clone();
      
      if (response.ok) {
        const responseBody = await response.text();
        console.log(`[Higgsfield] ✅ SUCCESS with model: ${variant}`);
        console.log(`[Higgsfield] Response body: ${responseBody.substring(0, 500)}`);
        
        // Parse the response body and return a new Response
        return { 
          response: new Response(responseBody, {
            status: response.status,
            headers: response.headers
          }), 
          usedModelId: variant,
          clonedResponse 
        };
      }
      
      const errorText = await response.text();
      console.log(`[Higgsfield] ❌ Failed ${variant}: ${response.status}`);
      console.log(`[Higgsfield] Error body: ${errorText.substring(0, 500)}`);
      
    } catch (error) {
      console.log(`[Higgsfield] ❌ Exception for ${variant}: ${error}`);
    }
  }
  
  console.log(`[Higgsfield] ========================================`);
  console.log(`[Higgsfield] ❌ ALL VARIANTS FAILED for model: ${modelId}`);
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HF_API_KEY = Deno.env.get('HF_API_KEY');
    const HF_API_SECRET = Deno.env.get('HF_API_SECRET');

    const body: GenerateRequest = await req.json();
    
    console.log('[Higgsfield] ========================================');
    console.log('[Higgsfield] Request action:', body.action);
    console.log('[Higgsfield] Request model:', body.model);
    console.log('[Higgsfield] Request prompt:', body.prompt?.substring(0, 100));

    // Handle ping action first (for credential check)
    if (body.action === 'ping') {
      if (!HF_API_KEY || !HF_API_SECRET) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Credenciais Higgsfield não configuradas. Configure HF_API_KEY e HF_API_SECRET.' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, configured: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!HF_API_KEY || !HF_API_SECRET) {
      console.error('[Higgsfield] Missing API credentials');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais Higgsfield não configuradas. Configure HF_API_KEY e HF_API_SECRET.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = `Key ${HF_API_KEY}:${HF_API_SECRET}`;

    if (body.action === 'generate') {
      // Generate new image
      if (!body.prompt || body.prompt.trim().length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Prompt é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const model = body.model || 'higgsfield-ai/soul/standard';
      console.log('[Higgsfield] Generating image with model:', model);
      console.log('[Higgsfield] Prompt:', body.prompt);
      console.log('[Higgsfield] Aspect ratio:', body.aspectRatio);
      console.log('[Higgsfield] Resolution:', body.resolution);
      
      const requestBody = {
        prompt: body.prompt,
        aspect_ratio: body.aspectRatio || '1:1',
        resolution: body.resolution || '1080p',
      };

      // Try model variants with fallback
      const result = await tryModelVariants(model, authHeader, requestBody);
      
      if (!result) {
        console.error('[Higgsfield] All model variants failed');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Nenhuma variante do modelo ${model} funcionou. Verifique os logs para detalhes.` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[Higgsfield] Using successful model: ${result.usedModelId}`);
      
      const data = await result.response.json();
      console.log('[Higgsfield] Generate response:', JSON.stringify(data).substring(0, 500));

      return new Response(
        JSON.stringify({ 
          success: true, 
          requestId: data.request_id || data.id,
          status: 'pending',
          usedModel: result.usedModelId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (body.action === 'status') {
      // Check status of existing job
      if (!body.requestId) {
        return new Response(
          JSON.stringify({ success: false, error: 'requestId é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Higgsfield] Checking status for:', body.requestId);

      const response = await fetch(`${HIGGSFIELD_API_URL}/requests/${body.requestId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
      });

      console.log('[Higgsfield] Status response code:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Higgsfield] Status check error:', response.status, errorText);
        
        // If 404, the request might not exist yet, return pending
        if (response.status === 404) {
          return new Response(
            JSON.stringify({ success: true, status: 'pending' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Erro ao verificar status: ${response.status}` 
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      console.log('[Higgsfield] Status response:', JSON.stringify(data).substring(0, 500));

      // Map Higgsfield status to our status
      let status = data.status || 'pending';
      let imageUrl = null;

      if (status === 'completed') {
        // Get image URL from the images array (per API docs)
        if (Array.isArray(data.images) && data.images.length > 0) {
          imageUrl = data.images[0].url || data.images[0];
        }
        console.log('[Higgsfield] Image URL:', imageUrl);
      } else if (status === 'queued') {
        status = 'pending';
      } else if (status === 'in_progress') {
        status = 'in_progress';
      } else if (status === 'failed') {
        status = 'failed';
      } else if (status === 'nsfw' || status === 'content_moderation') {
        status = 'nsfw';
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          status,
          imageUrl,
          error: data.error || null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (body.action === 'cancel') {
      // Cancel a job (if supported)
      if (!body.requestId) {
        return new Response(
          JSON.stringify({ success: false, error: 'requestId é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Higgsfield] Cancelling job:', body.requestId);

      try {
        await fetch(`${HIGGSFIELD_API_URL}/requests/${body.requestId}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
          },
        });

        return new Response(
          JSON.stringify({ success: true, status: 'cancelled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        // If cancel is not supported, just acknowledge
        return new Response(
          JSON.stringify({ success: true, status: 'cancelled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Ação inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[Higgsfield] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
