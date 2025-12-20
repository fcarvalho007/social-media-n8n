import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HIGGSFIELD_API_URL = 'https://platform.higgsfield.ai';
const HIGGSFIELD_MODEL = 'higgsfield-ai/soul/standard';

interface GenerateRequest {
  action: 'generate' | 'status' | 'cancel' | 'ping';
  prompt?: string;
  aspectRatio?: string;
  resolution?: string;
  requestId?: string;
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
    
    console.log('[Higgsfield] Request action:', body.action);

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

      console.log('[Higgsfield] Generating image with prompt:', body.prompt.substring(0, 100));
      
      const response = await fetch(`${HIGGSFIELD_API_URL}/${HIGGSFIELD_MODEL}`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: body.prompt,
          aspect_ratio: body.aspectRatio || '1:1',
          resolution: body.resolution || '1080p',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Higgsfield] API error:', response.status, errorText);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Erro na API Higgsfield: ${response.status}` 
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      console.log('[Higgsfield] Generate response:', JSON.stringify(data).substring(0, 200));

      return new Response(
        JSON.stringify({ 
          success: true, 
          requestId: data.request_id || data.id,
          status: 'pending'
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
      console.log('[Higgsfield] Status response:', JSON.stringify(data).substring(0, 300));

      // Map Higgsfield status to our status
      let status = data.status || 'pending';
      let imageUrl = null;

      if (status === 'completed') {
        // Get image URL from the images array (per API docs)
        if (Array.isArray(data.images) && data.images.length > 0) {
          imageUrl = data.images[0].url || data.images[0];
        }
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
