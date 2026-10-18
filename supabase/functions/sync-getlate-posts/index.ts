import { exigirEditor, erroSocial } from '../_shared/social-seguro.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.98.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Getlate.dev Account IDs
const GETLATE_ACCOUNTS: Record<string, string> = {
  instagram: '695d76684207e06f4ca84330', // @frederico.m.carvalho (reconectado 07/01/2025)
  linkedin: '68fb951d8bbca9c10cbfef93',
  youtube: '69344efdf43160a0bc99a480',
  facebook: '69344f55f43160a0bc99a481',
  tiktok: '69344fdef43160a0bc99a484',
  googlebusiness: '69666ca62b6dfd227e11c220', // @Frederico Carvalho (reconectado 13/01/2026)
};

// Reverse map: account ID -> platform name
const ACCOUNT_TO_PLATFORM: Record<string, string> = Object.fromEntries(
  Object.entries(GETLATE_ACCOUNTS).map(([k, v]) => [v, k])
);

interface GetlatePost {
  _id: string;
  content: string;
  status: 'draft' | 'scheduled' | 'queued' | 'published' | 'failed';
  scheduledFor?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  platforms: Array<{
    platform: string;
    accountId: string;
    status: string;
    publishedUrl?: string;
  }>;
  mediaItems?: Array<{
    type: 'image' | 'video' | 'document';
    url: string;
  }>;
}

interface SyncPayload {
  date_from?: string;  // ISO date string
  date_to?: string;    // ISO date string
  read_only?: boolean;
  force?: boolean;     // Force sync even if recently synced
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GETLATE_API_TOKEN = Deno.env.get('GETLATE_API_TOKEN');
    const GETLATE_BASE_URL = Deno.env.get('GETLATE_BASE_URL') || 'https://getlate.dev/api';
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

    if (!GETLATE_API_TOKEN) {
      throw new Error('GETLATE_API_TOKEN not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const userId=await exigirEditor(req,supabase);

    // Parse request body
    if(!['GET','POST'].includes(req.method)) return new Response(null,{status:405,headers:corsHeaders});
    const body: SyncPayload = req.method==='GET'?{}:await req.json();
    
    // Default: sync last 90 days
    const dateTo = body.date_to || new Date().toISOString();
    const dateFrom = body.date_from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`[sync-getlate-posts] Syncing from ${dateFrom} to ${dateTo}`);

    // Fetch posts from Getlate API - separate calls per status
    // (API may not support multiple statuses in one request)
    const allGetlatePosts: GetlatePost[] = [];
    const fetchErrors:string[]=[];
    const readOnly=req.method==='GET'||body.read_only===true;
    const statusesToSync = readOnly?['published']:['published', 'scheduled', 'failed', 'draft'];
    const limit = readOnly?5:50;

    for (const status of statusesToSync) {
      let page = 1;
      let hasMore = true;

      console.log(`[sync-getlate-posts] Fetching ${status} posts...`);

      while (hasMore) {
        const url = new URL(`${GETLATE_BASE_URL}/v1/posts`);
        url.searchParams.set('limit', limit.toString());
        url.searchParams.set('page', page.toString());
        url.searchParams.set('dateFrom', dateFrom);
        url.searchParams.set('dateTo', dateTo);
        url.searchParams.set('status', status); // One status at a time

        console.log(`[sync-getlate-posts] Fetching ${status} page ${page}: ${url.toString()}`);

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${GETLATE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[sync-getlate-posts] Getlate API error for ${status}: ${response.status} - ${errorText}`);
          fetchErrors.push(`${status}: HTTP ${response.status}`);
          break;
        }

        const rawText = await response.text();


        let data;
        try {
          data = JSON.parse(rawText);
        } catch (parseError) {
          fetchErrors.push(`${status}: resposta inválida`);
          break;
        }

        const posts: GetlatePost[] = data.posts || data.data || (Array.isArray(data) ? data : []);
        
        console.log(`[sync-getlate-posts] ${status} page ${page}: ${posts.length} posts`);
        
        allGetlatePosts.push(...posts);
        
        // Check if there are more pages
        if (readOnly || posts.length < limit) {
          hasMore = false;
        } else {
          page++;
          // Safety limit per status
          if (page > 10) {
            fetchErrors.push(`${status}: limite de páginas; sincronização incompleta`);
            hasMore = false;
          }
        }
      }
    }

    console.log(`[sync-getlate-posts] Total posts from all statuses: ${allGetlatePosts.length}`);

    console.log(`[sync-getlate-posts] Total posts from Getlate: ${allGetlatePosts.length}`);

    if (allGetlatePosts.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        synced: 0,
        message: 'Nenhum post encontrado no Getlate para o período especificado',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get existing posts by external ID to avoid duplicates
    const externalIds = allGetlatePosts.map(p => p._id);
    
    // Process each post
    if(req.method==='GET'||body.read_only) return new Response(JSON.stringify({success:fetchErrors.length===0,read_only:true,total:allGetlatePosts.length,errors:fetchErrors,posts:allGetlatePosts.slice(0,5).map(p=>({id:p._id,status:p.status,platforms:p.platforms?.map(a=>a.platform)}))}),{status:fetchErrors.length?502:200,headers:{...corsHeaders,'Content-Type':'application/json'}});

    let syncedPosts = 0;
    let syncedMedia = 0;
    const errors: string[] = [...fetchErrors];

    for (const getlatePost of allGetlatePosts) {
      try {
        // Map Getlate status to our status
        let status = 'published';
        if (getlatePost.status === 'scheduled') status = 'scheduled';
        else if (getlatePost.status === 'queued') status = 'scheduled';
        else if (getlatePost.status === 'failed') status = 'failed';
        else if (getlatePost.status === 'draft') status = 'pending';

        // Extract networks from platforms
        const selectedNetworks: string[] = [];
        const externalPostIds: Record<string, string> = {};
        
        for (const platform of getlatePost.platforms || []) {
          const accountId=typeof platform.accountId==='string'?platform.accountId:(platform.accountId as {_id?:string})?._id;
          const networkName = accountId ? ACCOUNT_TO_PLATFORM[accountId] : undefined;
          if(!networkName) continue;
          if (networkName && !selectedNetworks.includes(networkName)) {
            selectedNetworks.push(networkName);
          }
          if (platform.publishedUrl) {
            externalPostIds[networkName] = platform.publishedUrl;
          }
        }

        if(selectedNetworks.length===0) continue;

        // Extract media URLs
        const mediaUrls: string[] = (getlatePost.mediaItems || [])
          .map(m => m.url)
          .filter(Boolean);

        // Determine dates
        const scheduledDate = getlatePost.scheduledFor 
          ? new Date(getlatePost.scheduledFor).toISOString()
          : null;
        const publishedAt = getlatePost.publishedAt 
          ? new Date(getlatePost.publishedAt).toISOString()
          : (status === 'published' ? new Date(getlatePost.updatedAt).toISOString() : null);

        // Check if post already exists with this external ID
        const { data: existingPost } = await supabase
          .from('posts')
          .select('id, external_post_ids')
          .eq('user_id',userId)
          .eq('workflow_id',`getlate:${getlatePost._id}`)
          .limit(1)
          .maybeSingle();

        const postData = {
          workflow_id: `getlate:${getlatePost._id}`,
          tema: getlatePost.content?.substring(0, 100) || 'Post sincronizado',
          caption: getlatePost.content || '',
          content_type: 'carousel',
          status,
          selected_networks: selectedNetworks,
          external_post_ids: { 
            ...(existingPost?.external_post_ids || {}),
            getlate: getlatePost._id,
            ...externalPostIds,
          },
          template_a_images: mediaUrls.length > 0 ? mediaUrls : [],
          template_b_images: [],
          scheduled_date: scheduledDate,
          published_at: publishedAt,
          updated_at: new Date().toISOString(),
          source: 'getlate',
        };

        if (existingPost) {
          // Update existing post
          const { error: updateError } = await supabase
            .from('posts')
            .update(postData)
            .eq('id', existingPost.id).eq('user_id',userId);

          if (updateError) {
            console.error(`[sync-getlate-posts] Update error for ${getlatePost._id}:`, updateError);
            errors.push(`Update ${getlatePost._id}: ${updateError.message}`);
          } else {
            syncedPosts++;
          }
        } else {
          const insertUserId=userId;

          if (insertUserId) {
            const { error: insertError } = await supabase
              .from('posts')
              .insert({
                ...postData,
                user_id: insertUserId,
                created_at: new Date(getlatePost.createdAt).toISOString(),
              });

            if (insertError) {
              console.error(`[sync-getlate-posts] Insert error for ${getlatePost._id}:`, insertError);
              errors.push(`Insert ${getlatePost._id}: ${insertError.message}`);
            } else {
              syncedPosts++;
            }
          }
        }

        // Sync media to media_library
        // Get the post_id we just inserted/updated
        const { data: insertedPost } = await supabase
          .from('posts')
          .select('id')
          .eq('workflow_id', `getlate:${getlatePost._id}`).eq('user_id',userId).limit(1)
          .maybeSingle();
        
        // Extract publication URL from platforms
        const publicationUrl = getlatePost.platforms?.find(p => p.publishedUrl)?.publishedUrl || null;
        
        for (const mediaItem of getlatePost.mediaItems || []) {
          if (!mediaItem.url) continue;
          // Skip temporary URLs
          if (mediaItem.url.includes('media.getlate.dev/temp/')) continue;

          const fileName = mediaItem.url.split('/').pop() || `synced-${Date.now()}`;
          const fileType = mediaItem.type === 'video' ? 'video' : 'image';

          // Check if already exists
          const { data: existingMedia } = await supabase
            .from('media_library')
            .select('id')
            .eq('file_url', mediaItem.url).eq('user_id',userId).limit(1)
            .maybeSingle();

          if (!existingMedia && userId) {
            const { error: mediaError } = await supabase
              .from('media_library')
              .insert({
                user_id: userId,
                file_name: fileName,
                file_url: mediaItem.url,
                file_type: fileType,
                source: 'publication',
                is_favorite: false,
                created_at: new Date(getlatePost.createdAt).toISOString(),
                publication_url: publicationUrl,
                post_id: insertedPost?.id || null,
              });

            if (!mediaError) {
              syncedMedia++;
            }
          } else if (existingMedia && publicationUrl) {
            // Update existing media with publication_url if missing
            await supabase
              .from('media_library')
              .update({ 
                publication_url: publicationUrl,
                post_id: insertedPost?.id || null
              })
              .eq('id', existingMedia.id).eq('user_id',userId)
              .is('publication_url', null);
          }
        }
      } catch (postError) {
        console.error(`[sync-getlate-posts] Error processing post ${getlatePost._id}:`, postError);
        errors.push(`Process ${getlatePost._id}: ${postError instanceof Error ? postError.message : 'Unknown error'}`);
      }
    }

    console.log(`[sync-getlate-posts] Sync complete: ${syncedPosts} posts, ${syncedMedia} media items`);

    const hadErrors = errors.length > 0;
    const success = !hadErrors;
    
    return new Response(JSON.stringify({
      success,
      synced: syncedPosts,
      syncedMedia,
      total: allGetlatePosts.length,
      failed: errors.length,
      hadErrors,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      message: hadErrors 
        ? `Sincronizados ${syncedPosts}/${allGetlatePosts.length} posts (${errors.length} falharam)`
        : `Sincronizados ${syncedPosts} posts e ${syncedMedia} ficheiros de média`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return erroSocial(error,corsHeaders);
  }
});
