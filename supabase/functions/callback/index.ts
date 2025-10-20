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
    console.log('Callback webhook triggered');

    const payload = await req.json();
    console.log('Callback payload:', JSON.stringify(payload, null, 2));

    const { post_id, status, selected_template, caption_edited, hashtags_edited, notes } = payload;

    if (!post_id || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: post_id, status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get post data before updating
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', post_id)
      .single();

    if (fetchError || !post) {
      console.error('Post not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Post not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      console.error('Failed to update post:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update post', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send callback to n8n
    const callbackUrl = Deno.env.get('N8N_CALLBACK_WEBHOOK_URL');
    
    if (callbackUrl) {
      console.log('Sending callback to n8n:', callbackUrl);
      
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
        console.error('Failed to send callback to n8n:', n8nResponse.status, respText);
      } else {
        console.log('Callback sent successfully to n8n. Status:', n8nResponse.status, 'Body:', respText);
      }
    } else {
      console.warn('N8N_CALLBACK_WEBHOOK_URL not configured');
    }

    return new Response(
      JSON.stringify({ success: true, post_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in callback webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
