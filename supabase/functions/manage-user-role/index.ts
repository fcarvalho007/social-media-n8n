import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roles) {
      throw new Error('Only admins can manage roles');
    }

    const { userId, role, action } = await req.json();

    if (!userId || !role || !action) {
      throw new Error('userId, role, and action are required');
    }

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      throw new Error('Invalid role. Must be admin, editor, or viewer');
    }

    if (!['add', 'remove'].includes(action)) {
      throw new Error('Invalid action. Must be add or remove');
    }

    if (action === 'add') {
      // Add role
      const { error: insertError } = await supabaseClient
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
        });

      if (insertError) {
        // Check if role already exists
        if (insertError.code === '23505') {
          throw new Error('User already has this role');
        }
        throw insertError;
      }

      console.log(`Role ${role} added to user: ${userId}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Role ${role} adicionada com sucesso`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      // Remove role
      const { error: deleteError } = await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (deleteError) throw deleteError;

      console.log(`Role ${role} removed from user: ${userId}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Role ${role} removida com sucesso`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
  } catch (error: any) {
    console.error('Error in manage-user-role function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
