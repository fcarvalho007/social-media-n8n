import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  action: 'generate' | 'ping';
  prompt?: string;
  model?: string;
  aspectRatio?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const body: GenerateRequest = await req.json();
    console.log('[AI Generate] Request:', body.action);

    // Handle ping action for health check
    if (body.action === 'ping') {
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'LOVABLE_API_KEY não configurada.' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, configured: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error('[AI Generate] Missing LOVABLE_API_KEY');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'LOVABLE_API_KEY não configurada.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'generate') {
      if (!body.prompt) {
        return new Response(
          JSON.stringify({ success: false, error: 'Prompt é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const model = body.model || 'google/gemini-2.5-flash-image-preview';
      const aspectRatio = body.aspectRatio || '1:1';

      // Build prompt with aspect ratio hint
      const enhancedPrompt = `${body.prompt}. The image should be in ${aspectRatio} aspect ratio. Ultra high resolution, professional quality.`;

      console.log('[AI Generate] Calling Lovable AI Gateway with model:', model);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "user",
              content: enhancedPrompt,
            }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI Generate] Gateway error:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Limite de requisições excedido. Tenta novamente mais tarde.' 
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Créditos insuficientes. Adiciona fundos à tua conta Lovable.' 
            }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao gerar imagem' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      console.log('[AI Generate] Response received');

      // Extract image from response
      const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (!imageData) {
        console.error('[AI Generate] No image in response:', JSON.stringify(data).slice(0, 500));
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Nenhuma imagem gerada. Tenta reformular o prompt.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          imageUrl: imageData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Acção inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AI Generate] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
