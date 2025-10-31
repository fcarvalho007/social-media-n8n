import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
    const contentType = req.headers.get('content-type') || '';
    const isGetWithQuery = req.method === 'GET' && new URL(req.url).searchParams.get('url');

    let targetUrl: string | null = null;

    if (isGetWithQuery) {
      targetUrl = new URL(req.url).searchParams.get('url');
    } else if (contentType.includes('application/json')) {
      const { url } = await req.json();
      targetUrl = url;
    }

    if (!targetUrl || typeof targetUrl !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
      return new Response(
        JSON.stringify({ error: 'URL must start with http or https' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[image-proxy] Fetching external image:', targetUrl);

    const upstream = await fetch(targetUrl, {
      // Avoid sending cookies or credentials
      method: 'GET',
      headers: {
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'LovableImageProxy/1.0 (+https://lovable.dev)'
      },
    });

    if (!upstream.ok) {
      console.error('[image-proxy] Upstream error:', upstream.status, upstream.statusText);
      return new Response(
        JSON.stringify({ error: 'Upstream fetch failed', status: upstream.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ct = upstream.headers.get('content-type') || 'application/octet-stream';
    const buffer = await upstream.arrayBuffer();
    const base64 = base64Encode(buffer);

    // Return JSON so frontend can reconstruct a Blob easily
    return new Response(
      JSON.stringify({ contentType: ct, base64 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' } }
    );
  } catch (error) {
    console.error('[image-proxy] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});