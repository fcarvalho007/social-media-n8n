import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetlateUsageStats {
  planName?: string;
  plan?: { name?: string };
  limits?: { uploads: number; profiles?: number };
  usage?: { uploads?: number; profiles?: number; lastReset?: string };
  resetDate?: string;
}

interface GetlateAccount {
  _id: string;
  platform: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  isActive: boolean;
}

interface GetlatePost {
  _id: string;
  platforms?: Array<{ accountId: string; platform: string }>;
  publishedAt?: string;
  status?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const getlateToken = Deno.env.get('GETLATE_API_TOKEN');
    if (!getlateToken) {
      throw new Error('GETLATE_API_TOKEN not configured');
    }

    const baseUrl = Deno.env.get('GETLATE_BASE_URL') || 'https://getlate.dev/api';
    const headers = {
      'Authorization': `Bearer ${getlateToken}`,
      'Content-Type': 'application/json',
    };

    console.log('[Quota] Fetching data from Getlate.dev...');

    // Fetch all data in parallel: usage-stats, accounts, and today's posts
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

    const [statsResponse, accountsResponse, postsResponse] = await Promise.all([
      fetch(`${baseUrl}/v1/usage-stats`, { method: 'GET', headers }),
      fetch(`${baseUrl}/v1/accounts`, { method: 'GET', headers }),
      fetch(`${baseUrl}/v1/posts?dateFrom=${startOfDay}&dateTo=${endOfDay}&status=published&limit=100`, { method: 'GET', headers }),
    ]);

    // Process usage stats
    let stats: GetlateUsageStats = {};
    if (statsResponse.ok) {
      stats = await statsResponse.json();
      console.log('[Quota] Usage stats:', JSON.stringify(stats, null, 2));
    } else {
      console.warn('[Quota] Failed to fetch usage stats:', statsResponse.status);
    }

    // Process accounts
    let accounts: GetlateAccount[] = [];
    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      accounts = accountsData.accounts || accountsData || [];
      console.log('[Quota] Accounts found:', accounts.length);
    } else {
      console.warn('[Quota] Failed to fetch accounts:', accountsResponse.status);
    }

    // Process today's posts
    let todayPosts: GetlatePost[] = [];
    if (postsResponse.ok) {
      const postsData = await postsResponse.json();
      todayPosts = postsData.posts || postsData || [];
      console.log('[Quota] Posts today:', todayPosts.length);
    } else {
      console.warn('[Quota] Failed to fetch posts:', postsResponse.status);
    }

    // Calculate daily usage per platform
    const dailyUsageByPlatform: Record<string, number> = {};
    const dailyUsageByAccount: Record<string, { platform: string; count: number; username: string }> = {};

    todayPosts.forEach((post) => {
      post.platforms?.forEach((p) => {
        // Count by platform
        dailyUsageByPlatform[p.platform] = (dailyUsageByPlatform[p.platform] || 0) + 1;
        
        // Extract accountId - handle both string and object formats
        const accountId = typeof p.accountId === 'string' 
          ? p.accountId 
          : (p.accountId as any)?._id || (p.accountId as any)?.id || String(p.accountId);
        
        // Count by account
        if (!dailyUsageByAccount[accountId]) {
          const account = accounts.find(a => a._id === accountId);
          dailyUsageByAccount[accountId] = {
            platform: p.platform,
            count: 0,
            username: account?.username || 'Unknown',
          };
        }
        dailyUsageByAccount[accountId].count++;
      });
    });

    console.log('[Quota] Daily usage by platform:', dailyUsageByPlatform);
    console.log('[Quota] Daily usage by account:', dailyUsageByAccount);

    // Extract plan info
    const planName = stats?.planName || stats?.plan?.name || 'Free';
    const resetDate = stats?.resetDate || stats?.usage?.lastReset || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Process limits: -1 means unlimited
    let monthlyLimit = stats.limits?.uploads ?? 5;
    if (monthlyLimit === 0) {
      console.warn('[Quota] API returned limit = 0, using fallback of 5');
      monthlyLimit = 5;
    }
    const isUnlimited = monthlyLimit === -1;
    
    // Daily limit is typically 5 posts per day per account (AppSumo plan)
    const dailyLimitPerPlatform = 5;
    
    // Monthly usage from API
    const totalMonthlyUsed = stats.usage?.uploads ?? 0;

    // Calculate Instagram quota (daily)
    const instagramDailyUsed = dailyUsageByPlatform['instagram'] || 0;
    const instagramAccounts = accounts.filter(a => a.platform === 'instagram' && a.isActive);
    
    // Calculate LinkedIn quota (daily)
    const linkedinDailyUsed = dailyUsageByPlatform['linkedin'] || 0;
    const linkedinAccounts = accounts.filter(a => a.platform === 'linkedin' && a.isActive);

    // Build account breakdown for tooltip
    const accountBreakdown = Object.entries(dailyUsageByAccount).map(([accountId, data]) => ({
      accountId,
      platform: data.platform,
      username: data.username,
      postsToday: data.count,
    }));

    const quotaData = {
      instagram: {
        used_count: instagramDailyUsed,
        limit_count: isUnlimited ? -1 : dailyLimitPerPlatform,
        remaining: isUnlimited ? 999999 : Math.max(0, dailyLimitPerPlatform - instagramDailyUsed),
        monthly_used: totalMonthlyUsed,
        monthly_limit: monthlyLimit,
      },
      linkedin: {
        used_count: linkedinDailyUsed,
        limit_count: isUnlimited ? -1 : dailyLimitPerPlatform,
        remaining: isUnlimited ? 999999 : Math.max(0, dailyLimitPerPlatform - linkedinDailyUsed),
        monthly_used: totalMonthlyUsed,
        monthly_limit: monthlyLimit,
      },
      accounts: accounts.map(a => ({
        id: a._id,
        platform: a.platform,
        username: a.username,
        displayName: a.displayName,
        profilePicture: a.profilePicture,
        isActive: a.isActive,
      })),
      accountBreakdown,
      planName,
      resetDate,
      isUnlimited,
      dailyLimit: dailyLimitPerPlatform,
      lastUpdated: new Date().toISOString(),
    };

    console.log('[Quota] Returning quota data:', JSON.stringify(quotaData, null, 2));

    return new Response(JSON.stringify(quotaData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Quota] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        warning: errorMessage,
        instagram: { used_count: 0, limit_count: 5, remaining: 5, monthly_used: 0, monthly_limit: 5 },
        linkedin: { used_count: 0, limit_count: 5, remaining: 5, monthly_used: 0, monthly_limit: 5 },
        accounts: [],
        accountBreakdown: [],
        planName: 'Unknown',
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isUnlimited: false,
        dailyLimit: 5,
        lastUpdated: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
