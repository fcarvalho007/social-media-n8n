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
      throw new Error('Only admins can reset passwords');
    }

    const { userId, newPassword } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    // If newPassword is provided, set it directly
    if (newPassword) {
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (updateError) throw updateError;

      console.log(`Password updated for user: ${userId}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Password atualizada com sucesso',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      // Send password reset email
      const { data: targetUser, error: getUserError } = await supabaseClient.auth.admin.getUserById(userId);

      if (getUserError || !targetUser) {
        throw new Error('User not found');
      }

      const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(
        targetUser.user.email!,
        {
          redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`,
        }
      );

      if (resetError) throw resetError;

      console.log(`Password reset email sent to: ${targetUser.user.email}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email de reset enviado com sucesso',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
  } catch (error: any) {
    console.error('Error in reset-user-password function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
