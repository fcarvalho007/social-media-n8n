import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 [CALLBACK] Webhook triggered at', new Date().toISOString());

    const payload = await req.json();
    console.log('📋 [CALLBACK] Received payload:', JSON.stringify(payload, null, 2));

    const { post_id, status, selected_template, caption_edited, hashtags_edited, notes } = payload;

    if (!post_id || !status) {
      console.error('❌ [CALLBACK] Missing required fields:', { post_id, status });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: post_id, status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role (fallback to anon/publishable in testing)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
      Deno.env.get('SERVICE_ROLE_KEY') ||
      Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ||
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ||
      Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
      Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ [CALLBACK] Missing Supabase configuration:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!serviceRoleKey 
      });
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing Supabase URL or Key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const usingServiceRole = !!(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY'));
    console.log('✅ [CALLBACK] Supabase client initialized. Key type:', usingServiceRole ? 'service_role' : 'anon/publishable');
    console.log('🔑 [CALLBACK] Using key starting with:', serviceRoleKey.substring(0, 20) + '...');
    // Get post data before updating
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', post_id)
      .single();

    if (fetchError || !post) {
      console.error('❌ [CALLBACK] Post not found:', { post_id, error: fetchError });
      return new Response(
        JSON.stringify({ error: 'Post not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ [CALLBACK] Post found:', { id: post.id, workflow_id: post.workflow_id, current_status: post.status });

    // Update post status
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        status,
        selected_template,
        caption_edited,
        hashtags_edited,
        notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', post_id);

    if (updateError) {
      console.error('❌ [CALLBACK] Failed to update post:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update post', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ [CALLBACK] Post updated successfully:', { post_id, new_status: status });

    // Send callback to n8n
    const callbackUrl = Deno.env.get('N8N_CALLBACK_WEBHOOK_URL');
    
    if (callbackUrl) {
      console.log('📤 [CALLBACK] Sending callback to n8n:', callbackUrl);
      
      const isTemplateA = selected_template === 'A' || selected_template === 'template_a' || selected_template === 'a';
      const callbackPayload = {
        post_id,
        workflow_id: post.workflow_id,
        status,
        selected_template,
        caption_final: caption_edited || post.caption,
        hashtags_final: hashtags_edited || post.hashtags,
        images: isTemplateA ? post.template_a_images : post.template_b_images,
        metadata: isTemplateA ? post.template_a_metadata : post.template_b_metadata,
        notes,
      };

      const n8nResponse = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': Deno.env.get('N8N_WEBHOOK_SECRET') || '',
        },
        body: JSON.stringify(callbackPayload),
      });

      const respText = await n8nResponse.text();
      if (!n8nResponse.ok) {
        console.error('❌ [CALLBACK] Failed to send callback to n8n:', { 
          status: n8nResponse.status, 
          response: respText 
        });
      } else {
        console.log('✅ [CALLBACK] Callback sent successfully to n8n:', { 
          status: n8nResponse.status, 
          response: respText 
        });
      }
    } else {
      console.warn('⚠️ [CALLBACK] N8N_CALLBACK_WEBHOOK_URL not configured - skipping n8n notification');
    }

    return new Response(
      JSON.stringify({ success: true, post_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [CALLBACK] Unexpected error in callback webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
