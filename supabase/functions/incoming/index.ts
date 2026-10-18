import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.98.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Incoming webhook received');

    const expectedSecret=Deno.env.get('N8N_WEBHOOK_SECRET');
    if(!expectedSecret||req.headers.get('x-webhook-secret')!==expectedSecret) return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{...corsHeaders,'Content-Type':'application/json'}});
    if(req.method!=='POST') return new Response(null,{status:405,headers:corsHeaders});
    const payload=await req.json();
    if(typeof payload.user_id!=='string'||!/^[0-9a-f-]{36}$/i.test(payload.user_id)||typeof payload.workflow_id!=='string'||!payload.workflow_id.trim()) return new Response(JSON.stringify({error:'É necessário indicar o proprietário e o workflow.'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}});

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const roles=await supabase.from('user_roles').select('role').eq('user_id',payload.user_id).in('role',['admin','editor']);
    if(roles.error||!roles.data?.length) return new Response(JSON.stringify({error:'Proprietário sem permissão editorial.'}),{status:403,headers:{...corsHeaders,'Content-Type':'application/json'}});

    // Insert post into database
    const { data, error } = await supabase
      .from('posts')
      .insert({
        workflow_id: payload.workflow_id,
        user_id:payload.user_id,
        source: payload.source || 'n8n_workflow',
        tema: payload.tema,
        caption: payload.caption,
        hashtags: payload.hashtags || [],
        hashtags_text: payload.hashtags_text || null,
        template_a_images: payload.template_a_images,
        template_a_metadata: payload.template_a_metadata || {},
        template_b_images: payload.template_b_images || [],
        template_b_metadata: payload.template_b_metadata || {},
        status: payload.status || 'pending',
        selected_template: payload.selected_template || null,
        content_type: payload.content_type || 'carousel',
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save post', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if(!data){
      const previous=await supabase.from('posts').select('id').eq('user_id',payload.user_id).eq('workflow_id',payload.workflow_id).limit(1).maybeSingle();
      if(previous.error||!previous.data)throw new Error('Resultado do webhook não confirmado.');
      return new Response(JSON.stringify({success:true,deduplicated:true,post:previous.data}),{status:200,headers:{...corsHeaders,'Content-Type':'application/json'}});
    }
    console.log('Post created successfully:', data.id);

    return new Response(
      JSON.stringify({ success: true, post: data }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in incoming webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
