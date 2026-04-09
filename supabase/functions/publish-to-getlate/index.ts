import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Getlate.dev Account IDs (obtained from GET /v1/accounts)
const GETLATE_ACCOUNTS: Record<string, string> = {
  instagram: '695d76684207e06f4ca84330', // @frederico.m.carvalho (reconectado 07/01/2025)
  linkedin: '68fb951d8bbca9c10cbfef93',  // Frederico Carvalho
  youtube: '69344efdf43160a0bc99a480',   // fredericocarvalho
  facebook: '69344f55f43160a0bc99a481',  // fredericodigital
  tiktok: '69344fdef43160a0bc99a484',    // frederico.m.carvalho
  googlebusiness: '69666ca62b6dfd227e11c220', // @Frederico Carvalho (reconectado 13/01/2026)
};

// Map format to base network
const FORMAT_TO_NETWORK: Record<string, string> = {
  // Instagram
  instagram_carousel: 'instagram',
  instagram_image: 'instagram',
  instagram_stories: 'instagram',
  instagram_reel: 'instagram',
  // LinkedIn
  linkedin_post: 'linkedin',
  linkedin_document: 'linkedin',
  // YouTube
  youtube_shorts: 'youtube',
  youtube_video: 'youtube',
  // TikTok
  tiktok_video: 'tiktok',
  // Facebook
  facebook_image: 'facebook',
  facebook_stories: 'facebook',
  facebook_reel: 'facebook',
  // Google Business
  googlebusiness_post: 'googlebusiness',
};

interface PublishPayload {
  format: string;
  caption: string;
  media_urls: string[];
  scheduled_date?: string;
  scheduled_time?: string;
  publish_immediately: boolean;
  post_id?: string;  // Optional post ID for tracking failures
  idempotency_key?: string; // Unique key to prevent duplicate publications
}

interface GetlatePostPayload {
  content: string;
  scheduledFor?: string;
  timezone: string;
  publishNow?: boolean;
  platforms: Array<{
    platform: string;
    accountId: string;
    platformSpecificData?: {
      contentType?: 'story' | 'reel';
    };
  }>;
  mediaItems?: Array<{
    type: 'image' | 'video' | 'document';
    url: string;
  }>;
}

// Database-backed idempotency check
async function checkIdempotencyKey(supabase: any, key: string): Promise<{ exists: boolean; result?: any }> {
  try {
    const { data, error } = await supabase
      .from('idempotency_keys')
      .select('result')
      .eq('key', key)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    
    if (error) {
      console.error('[publish-to-getlate] Error checking idempotency key:', error);
      return { exists: false };
    }
    
    if (data) {
      console.log(`[publish-to-getlate] Found existing idempotency key: ${key}`);
      return { exists: true, result: data.result };
    }
    
    return { exists: false };
  } catch (err) {
    console.error('[publish-to-getlate] Exception checking idempotency:', err);
    return { exists: false };
  }
}

async function storeIdempotencyKey(supabase: any, key: string, result: any): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
    
    const { error } = await supabase
      .from('idempotency_keys')
      .upsert({
        key,
        result,
        expires_at: expiresAt,
      }, { onConflict: 'key' });
    
    if (error) {
      console.error('[publish-to-getlate] Error storing idempotency key:', error);
    } else {
      console.log(`[publish-to-getlate] Stored idempotency key: ${key}`);
    }
  } catch (err) {
    console.error('[publish-to-getlate] Exception storing idempotency:', err);
  }
}

// Cleanup expired keys (called periodically)
async function cleanupExpiredKeys(supabase: any): Promise<void> {
  try {
    await supabase
      .from('idempotency_keys')
      .delete()
      .lt('expires_at', new Date().toISOString());
  } catch (err) {
    // Ignore cleanup errors
  }
}

interface GetlateUsageStats {
  usage: {
    uploads: number;
  };
  limits: {
    uploads: number; // -1 means unlimited
  };
}

// Helper function to detect media type from URL extension
function getMediaTypeFromUrl(url: string): 'image' | 'video' | 'document' {
  const lowercaseUrl = url.toLowerCase();
  // Check for document (PDF)
  if (lowercaseUrl.includes('.pdf')) return 'document';
  // Check for video extensions
  if (lowercaseUrl.match(/\.(mp4|mov|webm|avi|mkv|m4v|quicktime)(\?|$)/)) return 'video';
  // Default to image (PNG, JPG, JPEG, WEBP, GIF, etc.)
  return 'image';
}

// Validate quota directly from Getlate API
async function validateQuotaFromGetlate(apiToken: string): Promise<{ canPublish: boolean; error?: string }> {
  try {
    console.log('[publish-to-getlate] Validating quota from Getlate API...');
    
    const response = await fetch('https://getlate.dev/api/v1/usage-stats', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      console.error(`[publish-to-getlate] Failed to fetch usage stats: ${response.status}`);
      // Allow on error to not block publishing
      return { canPublish: true };
    }

    const stats: GetlateUsageStats = await response.json();
    console.log('[publish-to-getlate] Getlate usage stats:', JSON.stringify(stats));

    // If uploads limit is -1, it's unlimited
    if (stats.limits.uploads === -1) {
      console.log('[publish-to-getlate] ✅ Unlimited plan - quota validated');
      return { canPublish: true };
    }

    // Check if within limit
    if (stats.usage.uploads < stats.limits.uploads) {
      console.log(`[publish-to-getlate] ✅ Quota OK: ${stats.usage.uploads}/${stats.limits.uploads}`);
      return { canPublish: true };
    }

    console.log(`[publish-to-getlate] ❌ Quota exceeded: ${stats.usage.uploads}/${stats.limits.uploads}`);
    return { 
      canPublish: false, 
      error: `Quota Getlate esgotada: ${stats.usage.uploads}/${stats.limits.uploads} uploads` 
    };
  } catch (error) {
    console.error('[publish-to-getlate] Error validating quota from Getlate:', error);
    // Allow on error to not block publishing
    return { canPublish: true };
  }
}

// Helper to detect rate limit errors
function isRateLimitError(status: number, responseText: string): boolean {
  if (status === 429) return true;
  if (status === 400) {
    const lowerText = responseText.toLowerCase();
    return lowerText.includes('too many actions') || 
           lowerText.includes('rate limit') ||
           lowerText.includes('media container') ||
           lowerText.includes('please wait');
  }
  return false;
}

// Interface for validated Getlate response
interface GetlateValidatedResponse {
  isRealSuccess: boolean;
  error?: string;
  errorType?: 'token_expired' | 'oauth_error' | 'rate_limit' | 'validation' | 'unknown';
  postUrl?: string;
  originalData: any;
}

// Validate that Getlate response indicates REAL success, not hidden errors
function validateGetlateResponse(responseData: any, responseText: string): GetlateValidatedResponse {
  const originalData = responseData;
  
  // Check for explicit error field
  if (responseData?.error) {
    const errorMsg = typeof responseData.error === 'string' 
      ? responseData.error 
      : JSON.stringify(responseData.error);
    
    // Detect token/OAuth errors
    if (errorMsg.toLowerCase().includes('token') || 
        errorMsg.toLowerCase().includes('oauth') ||
        errorMsg.toLowerCase().includes('session') ||
        errorMsg.toLowerCase().includes('expired') ||
        responseData.error?.code === 190) {
      return {
        isRealSuccess: false,
        error: `Token inválido ou expirado: ${errorMsg}`,
        errorType: 'token_expired',
        originalData,
      };
    }
    
    return {
      isRealSuccess: false,
      error: errorMsg,
      errorType: 'unknown',
      originalData,
    };
  }
  
  // Check for error in message field
  if (responseData?.message) {
    const msg = responseData.message.toLowerCase();
    if (msg.includes('error') || msg.includes('failed') || msg.includes('invalid')) {
      // Check for token-specific errors
      if (msg.includes('token') || msg.includes('oauth') || msg.includes('session') || msg.includes('expired')) {
        return {
          isRealSuccess: false,
          error: `Erro de autenticação: ${responseData.message}`,
          errorType: 'token_expired',
          originalData,
        };
      }
      return {
        isRealSuccess: false,
        error: responseData.message,
        errorType: 'unknown',
        originalData,
      };
    }
  }
  
  // Check for failed/error status field
  if (responseData?.status) {
    const status = responseData.status.toLowerCase();
    if (status === 'failed' || status === 'error' || status === 'rejected') {
      return {
        isRealSuccess: false,
        error: responseData.message || responseData.error || `Status: ${status}`,
        errorType: 'unknown',
        originalData,
      };
    }
  }
  
  // Check raw response for common OAuth error patterns
  const rawLower = (typeof responseText === 'string' ? responseText : '').toLowerCase();
  if (rawLower.includes('oauthexception') || 
      rawLower.includes('session has expired') ||
      rawLower.includes('token refresh failed') ||
      rawLower.includes('error validating access token')) {
    const errorSnippet = typeof responseText === 'string' 
      ? responseText.substring(0, 300) 
      : JSON.stringify(responseText).substring(0, 300);
    return {
      isRealSuccess: false,
      error: `Erro OAuth: ${errorSnippet}`,
      errorType: 'oauth_error',
      originalData,
    };
  }
  
  // Extract post URL if available
  const postUrl = responseData?.url || responseData?.postUrl || responseData?.permalink || responseData?.data?.url;
  
  // If we got here, it looks like a real success
  // But warn if there's no URL and status isn't clearly success
  if (!postUrl && responseData?.status !== 'published' && responseData?.status !== 'scheduled' && responseData?.status !== 'queued') {
    console.warn('[publish-to-getlate] ⚠️ Response has no URL and unclear status, but treating as success:', responseData);
  }
  
  return {
    isRealSuccess: true,
    postUrl,
    originalData,
  };
}

// Validate that media URLs are accessible before publishing
async function validateMediaUrls(urls: string[]): Promise<{ valid: boolean; invalidUrls: string[] }> {
  const invalidUrls: string[] = [];
  
  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        console.warn(`[publish-to-getlate] Media URL not accessible (${response.status}): ${url}`);
        invalidUrls.push(url);
      }
    } catch (err) {
      console.warn(`[publish-to-getlate] Media URL check failed: ${url}`, err);
      invalidUrls.push(url);
    }
  }
  
  return { valid: invalidUrls.length === 0, invalidUrls };
}

async function publishToGetlate(
  apiToken: string, 
  payload: GetlatePostPayload, 
  idempotencyKey?: string,
  retries = 1
): Promise<{ success: boolean; data?: any; error?: string; isRateLimit?: boolean; postUrl?: string }> {
  const apiUrl = 'https://getlate.dev/api/v1/posts';
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[publish-to-getlate] Attempt ${attempt}/${retries} - Publishing to Getlate API`);
      console.log(`[publish-to-getlate] Payload:`, JSON.stringify(payload, null, 2));
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180000); // 180s timeout for large video uploads

      // Build headers with Idempotency-Key per Getlate documentation
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      };
      
      // Add Idempotency-Key header if provided (prevents duplicate requests)
      if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey;
        console.log(`[publish-to-getlate] Using Idempotency-Key header: ${idempotencyKey}`);
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseText = await response.text();
      console.log(`[publish-to-getlate] Response status: ${response.status}`);
      console.log(`[publish-to-getlate] Response body: ${responseText}`);

      if (response.ok) {
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { raw: responseText };
        }
        
        // IMPORTANT: Validate that the response is a REAL success, not a hidden error
        const validated = validateGetlateResponse(data, responseText);
        
        if (!validated.isRealSuccess) {
          console.error(`[publish-to-getlate] ❌ Response was 200 OK but contains hidden error: ${validated.error}`);
          return { 
            success: false, 
            error: validated.error || 'Erro oculto na resposta do Getlate',
            data: validated.originalData,
          };
        }
        
        console.log(`[publish-to-getlate] ✅ Response validated as real success. PostURL: ${validated.postUrl || 'not provided'}`);
        return { 
          success: true, 
          data,
          postUrl: validated.postUrl,
        };
      } else {
        console.error(`[publish-to-getlate] API returned status ${response.status}: ${responseText}`);
        
        // Check if it's a rate limit error
        const rateLimited = isRateLimitError(response.status, responseText);
        
        if (rateLimited && attempt < retries) {
          // Exponential backoff for rate limits: 10s, 20s, 40s
          const backoffMs = Math.pow(2, attempt) * 5000;
          console.log(`[publish-to-getlate] Rate limit detected! Waiting ${backoffMs/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        
        if (attempt === retries) {
          return { 
            success: false, 
            error: `Getlate API error (${response.status}): ${responseText}`,
            isRateLimit: rateLimited
          };
        }
        
        // Non rate-limit error, short delay before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`[publish-to-getlate] Attempt ${attempt} failed:`, error);
      
      if (attempt === retries) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
      
      console.log(`[publish-to-getlate] Waiting 2 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return { success: false, error: 'All attempts failed' };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestStartTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Cleanup stuck "pending" publication attempts older than 10 minutes
    // This prevents orphaned attempts from accumulating
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: stuckAttempts, error: cleanupError } = await supabase
        .from('publication_attempts')
        .update({ 
          status: 'failed', 
          error_message: 'Timeout - publicação não concluída após 10 minutos' 
        })
        .eq('status', 'pending')
        .lt('attempted_at', tenMinutesAgo)
        .select('id');
      
      if (cleanupError) {
        console.warn('[publish-to-getlate] Cleanup of stuck attempts failed:', cleanupError);
      } else if (stuckAttempts && stuckAttempts.length > 0) {
        console.log(`[publish-to-getlate] Cleaned up ${stuckAttempts.length} stuck pending attempts`);
      }
    } catch (cleanupErr) {
      console.warn('[publish-to-getlate] Exception during cleanup:', cleanupErr);
    }

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

    const body = await req.json();
    const { format, caption, media_urls, scheduled_date, scheduled_time, publish_immediately, post_id, idempotency_key } = body as PublishPayload;

    console.log(`[publish-to-getlate] Processing publication for format: ${format}`);
    console.log(`[publish-to-getlate] post_id received: ${post_id || 'NULL ⚠️'}`);
    console.log(`[publish-to-getlate] Idempotency key: ${idempotency_key || 'none'}`);

    // Cleanup expired keys periodically (non-blocking)
    cleanupExpiredKeys(supabase);

    // Check for duplicate request using database-backed idempotency
    if (idempotency_key) {
      const idempotencyCheck = await checkIdempotencyKey(supabase, idempotency_key);
      if (idempotencyCheck.exists && idempotencyCheck.result) {
        console.log(`[publish-to-getlate] ⚠️ DUPLICATE REQUEST BLOCKED! Returning cached result for key: ${idempotency_key}`);
        return new Response(
          JSON.stringify(idempotencyCheck.result),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
    }

    // Get network from format
    const network = FORMAT_TO_NETWORK[format];
    if (!network) {
      throw new Error(`Invalid or unsupported format: ${format}`);
    }

    // Get account ID for the network
    const accountId = GETLATE_ACCOUNTS[network];
    if (!accountId) {
      throw new Error(`Account not configured for network: ${network}`);
    }

    // NOTE: Quota validation removed - Getlate.dev API is the sole authority
    // If quota is exceeded, the Getlate API will return an error which we handle below
    console.log('[publish-to-getlate] Skipping pre-validation - Getlate API will enforce quota limits');

    // For formats that don't require captions (stories), use a space if empty
    // Getlate API requires content to be non-empty
    const contentToSend = caption?.trim() || ' ';

    // Determine platformSpecificData for content type
    const getPlatformSpecificData = (format: string): { contentType?: 'story' | 'reel' } | undefined => {
      if (format.includes('stories')) return { contentType: 'story' };
      if (format.includes('reel') || format.includes('shorts')) return { contentType: 'reel' };
      return undefined; // Regular post doesn't need platformSpecificData
    };

    const platformSpecificData = getPlatformSpecificData(format);

    // Validate media URLs before building payload
    console.log(`[publish-to-getlate] Validating ${media_urls.length} media URL(s)...`);
    const mediaValidation = await validateMediaUrls(media_urls);
    if (!mediaValidation.valid) {
      console.error(`[publish-to-getlate] ❌ ${mediaValidation.invalidUrls.length} media URL(s) not accessible`);
      // Continue anyway - Getlate may still be able to fetch them
      console.warn(`[publish-to-getlate] Proceeding despite inaccessible URLs (Getlate may retry)`);
    } else {
      console.log(`[publish-to-getlate] ✅ All media URLs validated successfully`);
    }

    // Build mediaItems with correct type per individual file (not global format)
    const mediaItems = media_urls.map(url => {
      const mediaType = getMediaTypeFromUrl(url);
      console.log(`[publish-to-getlate] Media: ${url.split('/').pop()} → type: ${mediaType}`);
      return { type: mediaType, url };
    });

    console.log(`[publish-to-getlate] Media breakdown: ${mediaItems.map(m => m.type).join(', ')}`);

    // Build Getlate payload
    const getlatePayload: GetlatePostPayload = {
      content: contentToSend,
      timezone: 'Europe/Lisbon',
      platforms: [{
        platform: network,
        accountId: accountId,
        ...(platformSpecificData && { platformSpecificData }),
      }],
      mediaItems,
    };

    // Add publishNow for immediate publishing, or scheduledFor for scheduled posts
    if (publish_immediately) {
      getlatePayload.publishNow = true;
      console.log(`[publish-to-getlate] Immediate publishing: publishNow=true`);
    } else if (scheduled_date) {
      let scheduledDateTime = scheduled_date;
      if (scheduled_time) {
        // Combine date and time
        scheduledDateTime = `${scheduled_date}T${scheduled_time}:00`;
      }
      getlatePayload.scheduledFor = new Date(scheduledDateTime).toISOString();
      console.log(`[publish-to-getlate] Scheduled for: ${getlatePayload.scheduledFor}`);
    }

    // Log publication attempt - ALWAYS record, even without post_id
    const attemptRecord = {
      post_id: post_id || null,
      platform: network,
      format,
      status: 'pending',
    };
    
    console.log(`[publish-to-getlate] Recording initial attempt:`, JSON.stringify(attemptRecord));
    
    const { error: insertAttemptError } = await supabase.from('publication_attempts').insert(attemptRecord);
    if (insertAttemptError) {
      console.error('[publish-to-getlate] Failed to record attempt:', insertAttemptError);
    }

    // Publish to Getlate with idempotency key in header
    const result = await publishToGetlate(getlateToken, getlatePayload, idempotency_key);

    if (!result.success) {
      // Record failure
      console.error(`[publish-to-getlate] Publication failed: ${result.error}`);
      
      // Always log failed attempt
      const failedAttempt = {
        post_id: post_id || null,
        platform: network,
        format,
        status: 'failed',
        error_message: result.error,
      };
      
      console.log(`[publish-to-getlate] Recording failed attempt:`, JSON.stringify(failedAttempt));
      await supabase.from('publication_attempts').insert(failedAttempt);
      
      if (post_id) {
        // Update post with failure info
        const { data: postData } = await supabase
          .from('posts')
          .select('recovery_token')
          .eq('id', post_id)
          .single();
        
        await supabase
          .from('posts')
          .update({
            status: 'failed',
            error_log: result.error,
            failed_at: new Date().toISOString(),
          })
          .eq('id', post_id);

        // Send notification email
        try {
          const recoveryToken = postData?.recovery_token;
          
          // Get user email
          const { data: userData } = await supabase.auth.admin.getUserById(user.id);
          const userEmail = userData?.user?.email;

          if (userEmail && recoveryToken) {
            console.log(`[publish-to-getlate] Sending failure notification to ${userEmail}`);
            
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-publication-failure`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              },
              body: JSON.stringify({
                post_id,
                error_message: result.error,
                platform: network,
                format,
                recovery_token: recoveryToken,
                user_email: userEmail,
                post_caption: caption,
                media_count: media_urls.length,
              }),
            });
          }
        } catch (notifyError) {
          console.error('[publish-to-getlate] Failed to send notification:', notifyError);
        }
      }
      
      throw new Error(result.error || 'Failed to publish to Getlate');
    }

    // Log successful attempt - ALWAYS record, even without post_id
    const successAttempt = {
      post_id: post_id || null,
      platform: network,
      format,
      status: 'success',
      response_data: result.data,
    };
    
    console.log(`[publish-to-getlate] Recording success attempt:`, JSON.stringify({ ...successAttempt, response_data: '...' }));
    
    const { error: successAttemptError } = await supabase.from('publication_attempts').insert(successAttempt);
    if (successAttemptError) {
      console.error('[publish-to-getlate] Failed to record success attempt:', successAttemptError);
    }

    // Extract and save external post URL/ID to the posts table
    if (post_id && result.postUrl) {
      console.log(`[publish-to-getlate] Saving external link to post ${post_id}: ${result.postUrl}`);
      
      // Get current external_post_ids to merge (in case of multi-network publish)
      const { data: currentPost } = await supabase
        .from('posts')
        .select('external_post_ids')
        .eq('id', post_id)
        .single();
      
      const currentExternalIds = (currentPost?.external_post_ids as Record<string, string>) || {};
      const updatedExternalIds = {
        ...currentExternalIds,
        [network]: result.postUrl,
      };
      
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          external_post_ids: updatedExternalIds,
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', post_id);
      
      if (updateError) {
        console.error('[publish-to-getlate] Failed to save external_post_ids:', updateError);
      } else {
        console.log(`[publish-to-getlate] ✅ Saved external link for ${network}: ${result.postUrl}`);
      }
    }

    // NOTE: We no longer increment local quota - Getlate tracks usage automatically
    const totalTimeMs = Date.now() - requestStartTime;
    console.log(`[publish-to-getlate] ✅ Successfully published to ${network} in ${(totalTimeMs / 1000).toFixed(2)}s`);

    const successResponse = { 
      success: true, 
      message: `Publicado com sucesso em ${network}`,
      data: result.data,
      network,
      format,
      postUrl: result.postUrl,
    };

    // Store result in database for idempotency
    if (idempotency_key) {
      await storeIdempotencyKey(supabase, idempotency_key, successResponse);
    }

    return new Response(
      JSON.stringify(successResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[publish-to-getlate] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro ao publicar. Tenta novamente.';
    
    // Classify error for better frontend display
    const classifyPublishError = (msg: string): { code: string; source: string; isRetryable: boolean; suggestedAction: string } => {
      const lower = msg.toLowerCase();
      
      // Rate limit errors
      if (lower.includes('too many actions') || lower.includes('rate limit') || lower.includes('429') || lower.includes('please wait') || lower.includes('media container')) {
        return { code: 'RATE_LIMIT', source: 'platform', isRetryable: true, suggestedAction: 'Aguarda 15-30 minutos e tenta novamente' };
      }
      
      // Account/permission errors (403, accounts not belonging to user)
      if (lower.includes('403') || lower.includes('forbidden') || lower.includes('do not belong') || lower.includes('permission denied')) {
        return { code: 'ACCOUNT_ERROR', source: 'getlate', isRetryable: false, suggestedAction: 'Reconecta a conta no Getlate.dev' };
      }
      
      // Token/OAuth errors
      if (lower.includes('token') || lower.includes('oauth') || lower.includes('session') || lower.includes('expired') || lower.includes('code 190')) {
        return { code: 'TOKEN_EXPIRED', source: 'platform', isRetryable: false, suggestedAction: 'Reconecta a conta no Getlate.dev' };
      }
      
      // Auth errors
      if (lower.includes('unauthorized') || lower.includes('401')) {
        return { code: 'AUTH_ERROR', source: 'internal', isRetryable: false, suggestedAction: 'Faz login novamente' };
      }
      
      // Caption/content errors
      if (lower.includes('caption') || lower.includes('content') || lower.includes('text') || lower.includes('character') || lower.includes('hashtag') || lower.includes('link')) {
        return { code: 'CAPTION_ERROR', source: 'platform', isRetryable: false, suggestedAction: 'Revê a legenda e remove caracteres especiais ou links inválidos' };
      }
      
      // Media/dimension errors
      if (lower.includes('media') || lower.includes('format') || lower.includes('size') || lower.includes('aspect') || lower.includes('ratio') || 
          lower.includes('unsupported') || lower.includes('width') || lower.includes('height') || lower.includes('resize') || 
          lower.includes('dimension') || lower.includes('resolution') || lower.includes('pixel') || lower.includes('image') || lower.includes('allowed range')) {
        return { code: 'MEDIA_ERROR', source: 'platform', isRetryable: false, suggestedAction: 'Redimensiona para proporção 4:5 (1080x1350px)' };
      }
      
      // Quota errors
      if (lower.includes('quota') || lower.includes('limit exceeded') || lower.includes('upload limit')) {
        return { code: 'QUOTA_EXCEEDED', source: 'getlate', isRetryable: false, suggestedAction: 'Aguarda o reset de quota ou faz upgrade do plano' };
      }
      
      // Network/connectivity errors
      if (lower.includes('network') || lower.includes('timeout') || lower.includes('connection') || lower.includes('fetch') || lower.includes('econnrefused')) {
        return { code: 'NETWORK_ERROR', source: 'internal', isRetryable: true, suggestedAction: 'Verifica a ligação à internet e tenta novamente' };
      }
      
      // API/server errors
      if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('internal server')) {
        return { code: 'API_ERROR', source: 'getlate', isRetryable: true, suggestedAction: 'O servidor está indisponível. Tenta novamente em alguns minutos' };
      }
      
      return { code: 'UNKNOWN', source: 'unknown', isRetryable: true, suggestedAction: 'Tenta novamente ou contacta o suporte' };
    };
    
    const errorClassification = classifyPublishError(errorMessage);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: {
          message: errorMessage,
          code: errorClassification.code,
          source: errorClassification.source,
          originalError: errorMessage,
          isRetryable: errorClassification.isRetryable,
          suggestedAction: errorClassification.suggestedAction,
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
