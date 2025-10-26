import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

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

    const contentType = req.headers.get('content-type') || '';
    let pdfFile: File | Blob;
    let fileName: string;

    // Mode 1: Receive storagePath in JSON (new preferred method)
    if (contentType.includes('application/json')) {
      const { storagePath } = await req.json();

      if (!storagePath) {
        console.error('[PROXY] No storagePath provided');
        return new Response(
          JSON.stringify({ ok: false, code: 400, message: 'storagePath required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      console.log('[PROXY] Downloading PDF from storage:', storagePath);

      // Download from Supabase Storage using service role
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data, error } = await supabase.storage
        .from('pdfs')
        .download(storagePath);

      if (error || !data) {
        console.error('[PROXY] Storage download failed:', error);
        return new Response(
          JSON.stringify({ ok: false, code: 500, message: `Storage download failed: ${error?.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      pdfFile = data;
      fileName = storagePath.split('/').pop() || 'carousel.pdf';
      console.log('[PROXY] Downloaded from storage', { fileName, sizeMB: (data.size / 1024 / 1024).toFixed(2) });

    } else {
      // Mode 2: Receive FormData with PDF blob (legacy)
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        console.error('[PROXY] No file received in FormData');
        return new Response(
          JSON.stringify({ ok: false, code: 400, message: 'No file provided' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      if (file.type !== 'application/pdf') {
        console.error('[PROXY] Invalid file type:', file.type);
        return new Response(
          JSON.stringify({ ok: false, code: 400, message: 'File must be a PDF' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      pdfFile = file;
      fileName = file.name;
      console.log('[PROXY] Received PDF via FormData', { name: fileName, sizeMB: (file.size / 1024 / 1024).toFixed(2) });
    }

    const sizeMB = (pdfFile.size / (1024 * 1024)).toFixed(2);
    console.log('[PROXY] Uploading PDF to Getlate:', { name: fileName, sizeMB });

    // Upload to Getlate
    const getlateFormData = new FormData();
    getlateFormData.append('file', pdfFile, fileName);

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
