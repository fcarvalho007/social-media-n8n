import { exigirEditor, erroSocial } from '../_shared/social-seguro.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.98.0';

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

    await exigirEditor(req,supabase);

    console.log('[get-getlate-accounts] Fetching accounts from Getlate API...');

    // First get profiles
    const profilesResponse = await fetch('https://getlate.dev/api/v1/profiles', {
      headers: {
        'Authorization': `Bearer ${getlateToken}`,
      },
    });

    const profilesText = await profilesResponse.text();
    if(!profilesResponse.ok) throw new Error('O fornecedor não confirmou os perfis.');

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
      if(!accountsResponse.ok) throw new Error('O fornecedor não confirmou as contas.');

      try {
        const accountsData = JSON.parse(accountsText);
        const accounts = accountsData.accounts || accountsData || [];
        
        for (const account of accounts) {
          allAccounts.push({
            _id:account._id,platform:account.platform,username:account.username,displayName:account.displayName,isActive:account.isActive,
            profileId: profile._id,
            profileName: profile.name,
          });
        }
      } catch {
        console.error(`[get-getlate-accounts] Failed to parse accounts for profile ${profile.name}`);
      }
    }



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

  } catch(error) {return erroSocial(error,corsHeaders);}
});
