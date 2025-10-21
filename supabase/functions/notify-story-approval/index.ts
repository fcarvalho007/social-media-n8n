import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApprovalPayload {
  post_id: string;
  status: 'approved' | 'rejected';
  caption_final: string;
  reviewed_by: string;
  reviewed_at: string;
  notes?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ApprovalPayload = await req.json();
    
    console.log('Received approval payload:', payload);

    // Only send webhook for approved stories
    if (payload.status !== 'approved') {
      console.log('Status is not approved, skipping webhook call');
      return new Response(
        JSON.stringify({ success: true, message: 'No webhook needed for non-approved status' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get webhook secret from environment
    const webhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('N8N_WEBHOOK_SECRET not configured');
      throw new Error('Webhook secret not configured');
    }

    // Call N8N webhook
    const webhookUrl = 'https://n8n.digitalsprints.pt/webhook/aprovacao-stories';
    console.log('Calling N8N webhook:', webhookUrl);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${webhookSecret}`,
      },
      body: JSON.stringify({
        post_id: payload.post_id,
        status: payload.status,
        caption_final: payload.caption_final,
        reviewed_by: payload.reviewed_by,
        reviewed_at: payload.reviewed_at,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('N8N webhook error:', response.status, errorText);
      throw new Error(`Webhook failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('N8N webhook success:', result);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in notify-story-approval:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
