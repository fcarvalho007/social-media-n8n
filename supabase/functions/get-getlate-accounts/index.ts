import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Getlate API token
    const getlateToken = Deno.env.get('GETLATE_API_TOKEN');
    if (!getlateToken) {
      throw new Error('GETLATE_API_TOKEN not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('[get-getlate-accounts] Fetching accounts from Getlate API...');

    // First get profiles
    const profilesResponse = await fetch('https://getlate.dev/api/v1/profiles', {
      headers: {
        'Authorization': `Bearer ${getlateToken}`,
      },
    });

    const profilesText = await profilesResponse.text();
    console.log('[get-getlate-accounts] Profiles response:', profilesText);

    let profiles = [];
    try {
      const profilesData = JSON.parse(profilesText);
      profiles = profilesData.profiles || [];
    } catch {
      profiles = [];
    }

    // For each profile, get the accounts
    const allAccounts: any[] = [];
    
    for (const profile of profiles) {
      console.log(`[get-getlate-accounts] Fetching accounts for profile: ${profile._id} (${profile.name})`);
      
      const accountsResponse = await fetch(`https://getlate.dev/api/v1/accounts?profileId=${profile._id}`, {
        headers: {
          'Authorization': `Bearer ${getlateToken}`,
        },
      });

      const accountsText = await accountsResponse.text();
      console.log(`[get-getlate-accounts] Accounts for profile ${profile.name}:`, accountsText);

      try {
        const accountsData = JSON.parse(accountsText);
        const accounts = accountsData.accounts || accountsData || [];
        
        for (const account of accounts) {
          allAccounts.push({
            ...account,
            profileId: profile._id,
            profileName: profile.name,
          });
        }
      } catch {
        console.error(`[get-getlate-accounts] Failed to parse accounts for profile ${profile.name}`);
      }
    }

    console.log('[get-getlate-accounts] All accounts:', JSON.stringify(allAccounts, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true, 
        profiles,
        accounts: allAccounts,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[get-getlate-accounts] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
