import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IMAGE_TIMEOUT_MS = 15000;
const MAX_URLS = 30;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  const startTime = Date.now();
  
  try {
    const { urls } = await req.json();
    
    // Validation
    if (!Array.isArray(urls)) {
      return new Response(
        JSON.stringify({
          ok: false,
          stage: 'parse',
          code: 422,
          message: 'urls must be an array',
          details: [],
          meta: { ts: new Date().toISOString() },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (urls.length === 0 || urls.length > MAX_URLS) {
      return new Response(
        JSON.stringify({
          ok: false,
          stage: 'parse',
          code: 422,
          message: `urls must contain between 1 and ${MAX_URLS} items`,
          details: [],
          meta: { ts: new Date().toISOString() },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[FETCH-IMG] Processing ${urls.length} images`);
    
    const items: Array<{ index: number; url: string; mime: string; base64: string }> = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      if (typeof url !== 'string' || !url.trim()) {
        return new Response(
          JSON.stringify({
            ok: false,
            stage: 'fetch',
            code: 422,
            message: 'Invalid URL at index ' + i,
            details: [{ index: i, url, reason: 'invalid-url' }],
            meta: { t_fetch: Date.now() - startTime },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
        
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        
        if (!resp.ok) {
          return new Response(
            JSON.stringify({
              ok: false,
              stage: 'fetch',
              code: resp.status,
              message: `Failed to fetch image ${i + 1}`,
              details: [{ index: i, url, reason: `http-${resp.status}` }],
              meta: { t_fetch: Date.now() - startTime },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
        
        const contentType = resp.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
          return new Response(
            JSON.stringify({
              ok: false,
              stage: 'fetch',
              code: 415,
              message: `Invalid content type for image ${i + 1}`,
              details: [{ index: i, url, reason: 'not-an-image', contentType }],
              meta: { t_fetch: Date.now() - startTime },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
        
        // Convert to base64
        const arrayBuffer = await resp.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        // Convert bytes to base64 in chunks to avoid stack overflow
        let binary = '';
        const chunkSize = 8192;
        for (let j = 0; j < bytes.length; j += chunkSize) {
          const chunk = bytes.slice(j, j + chunkSize);
          binary += String.fromCharCode(...chunk);
        }
        const base64 = btoa(binary);
        
        const mime = contentType.split(';')[0];
        items.push({ index: i, url, mime, base64 });
        
        console.log(`[FETCH-IMG] Image ${i + 1}/${urls.length} processed (${mime}, ${(bytes.length / 1024).toFixed(1)} KB)`);
      } catch (err: any) {
        const reason = err.name === 'AbortError' ? 'timeout' : (err.message || 'fetch-error');
        
        return new Response(
          JSON.stringify({
            ok: false,
            stage: 'fetch',
            code: 500,
            message: `Failed to fetch image ${i + 1}`,
            details: [{ index: i, url, reason }],
            meta: { t_fetch: Date.now() - startTime },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }
    
    const elapsedMs = Date.now() - startTime;
    console.log(`[FETCH-IMG] All ${items.length} images processed successfully in ${elapsedMs}ms`);
    
    return new Response(
      JSON.stringify({
        ok: true,
        items,
        meta: { t_fetch: elapsedMs, count: items.length },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    console.error('[FETCH-IMG] Unexpected error:', err);
    
    return new Response(
      JSON.stringify({
        ok: false,
        stage: 'unknown',
        code: 500,
        message: err?.message || 'Internal server error',
        details: [],
        meta: { ts: new Date().toISOString() },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
