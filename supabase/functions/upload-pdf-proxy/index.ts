import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const GETLATE_TOKEN = Deno.env.get('GETLATE_API_TOKEN');
    if (!GETLATE_TOKEN) {
      console.error('[PROXY] GETLATE_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ ok: false, code: 500, message: 'API token not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Receive FormData with PDF blob
    const formData = await req.formData();
    const pdfFile = formData.get('file') as File;

    if (!pdfFile) {
      console.error('[PROXY] No file received');
      return new Response(
        JSON.stringify({ ok: false, code: 400, message: 'No file provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (pdfFile.type !== 'application/pdf') {
      console.error('[PROXY] Invalid file type:', pdfFile.type);
      return new Response(
        JSON.stringify({ ok: false, code: 400, message: 'File must be a PDF' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const sizeMB = (pdfFile.size / (1024 * 1024)).toFixed(2);
    console.log('[PROXY] Uploading PDF:', { name: pdfFile.name, sizeMB, type: pdfFile.type });

    // Upload to Getlate
    const getlateFormData = new FormData();
    getlateFormData.append('file', pdfFile, pdfFile.name);

    const uploadStart = Date.now();
    const response = await fetch('https://getlate.dev/api/v1/media', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GETLATE_TOKEN}`,
      },
      body: getlateFormData,
    });

    const uploadElapsed = Date.now() - uploadStart;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PROXY] Upload failed:', { status: response.status, error: errorText });
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: response.status, 
          message: `Upload failed: ${errorText}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const data = await response.json();
    const uploadedUrl = data.files?.[0]?.url || data.url;

    if (!uploadedUrl) {
      console.error('[PROXY] No URL in response:', data);
      return new Response(
        JSON.stringify({ ok: false, code: 500, message: 'No URL returned from upload' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('[PROXY] Upload successful:', { url: uploadedUrl, elapsed: uploadElapsed });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        url: uploadedUrl,
        sizeMB: parseFloat(sizeMB),
        elapsed: uploadElapsed 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[PROXY] Error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        code: 500, 
        message: error?.message || 'Internal server error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
