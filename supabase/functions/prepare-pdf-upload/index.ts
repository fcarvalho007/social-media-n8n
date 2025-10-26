import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { postId, userId } = await req.json();

    if (!postId || !userId) {
      return new Response(
        JSON.stringify({ ok: false, message: 'postId and userId are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Ensure bucket exists
    const bucketName = 'pdfs';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucketName);

    if (!bucketExists) {
      console.log('[PREPARE] Creating pdfs bucket');
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 104857600, // 100 MB
      });
      if (createError) {
        console.error('[PREPARE] Failed to create bucket:', createError);
        return new Response(
          JSON.stringify({ ok: false, message: `Failed to create bucket: ${createError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    // Generate path: pdfs/{userId}/{postId}-{timestamp}.pdf
    const timestamp = Date.now();
    const path = `${userId}/${postId}-${timestamp}.pdf`;

    console.log('[PREPARE] Creating signed upload URL', { path });

    // Create signed upload URL (valid for 5 minutes)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .createSignedUploadUrl(path);

    if (uploadError) {
      console.error('[PREPARE] Failed to create signed URL:', uploadError);
      return new Response(
        JSON.stringify({ ok: false, message: `Failed to create signed URL: ${uploadError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    console.log('[PREPARE] Signed URL created', { path, expiresAt });

    return new Response(
      JSON.stringify({
        ok: true,
        path,
        uploadUrl: uploadData.signedUrl,
        expiresAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[PREPARE] Error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        message: error?.message || 'Internal server error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
