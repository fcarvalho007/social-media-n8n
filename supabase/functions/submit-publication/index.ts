import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmitRequest {
  content_text?: string;
  pdf_base64?: string;
  pdf_filename?: string;
  submitted_by: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content_text, pdf_base64, pdf_filename, submitted_by }: SubmitRequest = await req.json();
    
    console.log('Received submission:', {
      has_text: !!content_text,
      has_pdf: !!pdf_base64,
      pdf_filename,
      submitted_by
    });

    // Validate that at least one field is provided
    if (!content_text && !pdf_base64) {
      return new Response(
        JSON.stringify({ error: 'Pelo menos um campo deve ser preenchido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare payload for n8n
    const payload = {
      content_text: content_text || null,
      pdf_base64: pdf_base64 || null,
      pdf_filename: pdf_filename || null,
      source: 'lovable_form',
      submitted_at: new Date().toISOString(),
      submitted_by: submitted_by,
    };

    console.log('Calling n8n webhook...');

    // Call n8n webhook from server-side (no CORS issues)
    const n8nResponse = await fetch(
      'https://n8n.srv881120.hstgr.cloud/webhook/nova-publicacao-lovable',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('n8n webhook error:', errorText);
      throw new Error(`n8n webhook failed: ${n8nResponse.status}`);
    }

    const n8nData = await n8nResponse.json();
    console.log('n8n response:', n8nData);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Publicação enviada com sucesso!',
        data: n8nData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error submitting publication:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return new Response(
      JSON.stringify({ 
        error: 'Falha ao enviar a publicação',
        details: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
