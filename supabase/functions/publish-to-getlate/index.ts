import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurable base URL (default: production)
const GETLATE_BASE_URL = Deno.env.get('GETLATE_BASE_URL') || 'https://getlate.dev/api';

interface PublishRequest {
  postId: string;
  platform: 'instagram' | 'linkedin';
  postType: 'single_image' | 'carousel' | 'video' | 'text_only';
  caption?: string;
  body?: string;
  hashtags: string[];
  // Instagram-specific
  images?: string[]; // Array of image URLs in order
  // LinkedIn-specific (carousel as PDF)
  pdfUrl?: string;
  pdfBase64?: string; // Base64 encoded PDF data
  pageAlts?: string[]; // Alt text for each PDF page
  pdfMetadata?: { sizeMB: number; pages: number };
  // Video
  videoUrl?: string;
  scheduleAt?: string;
}

// Test connectivity to Getlate API
interface HealthCheckRequest {
  test: boolean;
}

// Server-side validation
function validateRequest(req: PublishRequest): string[] {
  const errors: string[] = [];
  const { platform, postType, caption, body, hashtags, images, pdfUrl, pdfBase64, pdfMetadata, videoUrl } = req;

  if (platform === 'instagram') {
    // Caption validation
    if (caption && caption.length > 2200) {
      errors.push(`IG caption exceeds 2200 chars (${caption.length})`);
    }
    
    // Hashtags validation
    if (hashtags.length > 30) {
      errors.push(`IG hashtags exceed 30 (${hashtags.length})`);
    }
    
    // Carousel validation (Instagram uses native images)
    if (postType === 'carousel') {
      const imageCount = images?.length || 0;
      if (imageCount < 2 || imageCount > 10) {
        errors.push(`IG carousel requires 2-10 images (${imageCount})`);
      }
    }
  }

  if (platform === 'linkedin') {
    // Body validation
    const textContent = body || caption || '';
    if (textContent.length > 3000) {
      errors.push(`LI body exceeds 3000 chars (${textContent.length})`);
    }
    
    // Document validation (carousel as PDF)
    if (postType === 'carousel') {
      if (!pdfUrl && !pdfBase64) {
        errors.push('LI carousel requires pdfUrl or pdfBase64');
      }
      if (pdfMetadata) {
        if (pdfMetadata.sizeMB > 100) {
          errors.push(`PDF exceeds 100 MB (${pdfMetadata.sizeMB.toFixed(2)} MB)`);
        }
        if (pdfMetadata.pages > 300) {
          errors.push(`PDF exceeds 300 pages (${pdfMetadata.pages})`);
        }
        if (pdfMetadata.pages < 1) {
          errors.push('PDF must have at least 1 page');
        }
      }
    }
  }

  return errors;
}

// Deduplicate hashtags
function deduplicateHashtags(hashtags: string[]): string[] {
  const normalized = hashtags.map(h => h.toLowerCase().trim());
  const unique = [...new Set(normalized)];
  return unique.map(h => h.startsWith('#') ? h : `#${h}`);
}

// Move URLs to end for LinkedIn
function formatLinkedInBody(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls: string[] = [];
  const cleanText = text.replace(urlRegex, (match) => {
    urls.push(match);
    return '';
  }).trim();
  
  return urls.length > 0 ? `${cleanText}\n\n${urls.join('\n')}` : cleanText;
}

// Helper: Fetch with timeout and retries
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  timeoutMs = 25000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.log(`[PUBLISH] Attempt ${attempt}/${maxRetries} to ${url}`);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`[PUBLISH] Retry ${attempt} failed, waiting ${backoffMs}ms:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError || new Error('Failed after max retries');
}

// Upload media file to Getlate
async function uploadMediaToGetlate(
  fileUrlOrData: string,
  token: string,
  mediaType: 'image' | 'video' | 'document',
  isBase64 = false
): Promise<string> {
  console.log(`[MEDIA] Uploading ${mediaType}`);
  
  let fileBlob: Blob;
  let filename: string;
  
  if (isBase64) {
    // Handle base64 data (for PDF documents)
    console.log('[MEDIA] Processing base64 data');
    const base64Data = fileUrlOrData.split(',')[1] || fileUrlOrData;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    fileBlob = new Blob([byteArray], { type: 'application/pdf' });
    filename = `carousel-${Date.now()}.pdf`;
  } else {
    // Fetch the file from URL
    const fileResponse = await fetch(fileUrlOrData);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }
    
    fileBlob = await fileResponse.blob();
    filename = fileUrlOrData.split('/').pop() || `media-${Date.now()}`;
  }
  
  console.log(`[MEDIA] File size: ${(fileBlob.size / 1024 / 1024).toFixed(2)} MB`);
  
  // Upload to Getlate via multipart/form-data
  const formData = new FormData();
  formData.append('file', fileBlob, filename);
  
  const uploadResponse = await fetchWithRetry(
    `${GETLATE_BASE_URL}/v1/media`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }
  );
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Media upload failed: ${errorText}`);
  }
  
  const uploadData = await uploadResponse.json();
  
  console.log(`[MEDIA] Upload successful`);
  
  // Return the URL of the uploaded file
  if (uploadData.files && uploadData.files.length > 0) {
    return uploadData.files[0].url;
  }
  if (uploadData.url) {
    return uploadData.url;
  }
  
  throw new Error('No URL returned from media upload');
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GETLATE_TOKEN = Deno.env.get('GETLATE_API_TOKEN');
    if (!GETLATE_TOKEN) {
      throw new Error('GETLATE_API_TOKEN not configured');
    }

    const requestData: PublishRequest | HealthCheckRequest = await req.json();
    
    // Health check / connectivity test
    if ('test' in requestData && requestData.test) {
      console.log('[HEALTH] Running connectivity test');
      
      const testResponse = await fetchWithRetry(
        `${GETLATE_BASE_URL}/v1/usage-stats`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${GETLATE_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const testData = await testResponse.json();
      
      return new Response(
        JSON.stringify({
          success: true,
          test: true,
          baseUrl: GETLATE_BASE_URL,
          status: testResponse.status,
          usageStats: testData,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const publishRequest = requestData as PublishRequest;
    console.log('[PUBLISH] Request:', {
      postId: publishRequest.postId,
      platform: publishRequest.platform,
      postType: publishRequest.postType,
      timestamp: new Date().toISOString(),
    });

    // Server-side validation
    const validationErrors = validateRequest(publishRequest);
    if (validationErrors.length > 0) {
      console.error('[PUBLISH] Validation failed:', validationErrors);
      return new Response(
        JSON.stringify({
          ok: false,
          stage: 'validation',
          code: 400,
          message: 'Validation failed',
          details: validationErrors,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const {
      postId,
      platform,
      postType,
      caption,
      body,
      hashtags: rawHashtags,
      images,
      pdfUrl,
      pdfBase64,
      pageAlts,
      pdfMetadata,
      videoUrl,
      scheduleAt,
    } = publishRequest;

    console.log('[PUBLISH] Processing:', {
      platform,
      postType,
      hasImages: !!images,
      imageCount: images?.length,
      hasPdf: !!(pdfUrl || pdfBase64),
      pdfMetadata,
    });

    // Deduplicate hashtags
    const hashtags = deduplicateHashtags(rawHashtags);

    // Upload media files first
    const mediaItems: Array<{ type: string; url: string }> = [];
    
    if (platform === 'instagram' && postType === 'carousel' && images && images.length > 0) {
      console.log('[PUBLISH] Uploading Instagram carousel images');
      for (const imgUrl of images) {
        const uploadedUrl = await uploadMediaToGetlate(imgUrl, GETLATE_TOKEN, 'image');
        mediaItems.push({ type: 'image', url: uploadedUrl });
      }
    } else if (platform === 'instagram' && images && images.length > 0) {
      // Single image
      const uploadedUrl = await uploadMediaToGetlate(images[0], GETLATE_TOKEN, 'image');
      mediaItems.push({ type: 'image', url: uploadedUrl });
    } else if (platform === 'instagram' && videoUrl) {
      const uploadedUrl = await uploadMediaToGetlate(videoUrl, GETLATE_TOKEN, 'video');
      mediaItems.push({ type: 'video', url: uploadedUrl });
    } else if (platform === 'linkedin' && postType === 'carousel' && (pdfUrl || pdfBase64)) {
      console.log('[PUBLISH] Uploading LinkedIn PDF document');
      
      if (pdfBase64) {
        // Handle base64 PDF data directly
        const uploadedUrl = await uploadMediaToGetlate(pdfBase64, GETLATE_TOKEN, 'document', true);
        mediaItems.push({ type: 'document', url: uploadedUrl });
      } else if (pdfUrl) {
        // Handle PDF URL
        const uploadedUrl = await uploadMediaToGetlate(pdfUrl, GETLATE_TOKEN, 'document', false);
        mediaItems.push({ type: 'document', url: uploadedUrl });
      }
    } else if (platform === 'linkedin' && videoUrl) {
      const uploadedUrl = await uploadMediaToGetlate(videoUrl, GETLATE_TOKEN, 'video');
      mediaItems.push({ type: 'video', url: uploadedUrl });
    } else if (platform === 'linkedin' && images && images.length > 0) {
      for (const imgUrl of images) {
        const uploadedUrl = await uploadMediaToGetlate(imgUrl, GETLATE_TOKEN, 'image');
        mediaItems.push({ type: 'image', url: uploadedUrl });
      }
    }

    // Build post content
    let postContent: string;
    if (platform === 'instagram') {
      postContent = `${caption || ''}\n\n${hashtags.join(' ')}`.trim();
    } else if (platform === 'linkedin') {
      const textWithHashtags = `${body || caption || ''}\n\n${hashtags.join(' ')}`.trim();
      postContent = formatLinkedInBody(textWithHashtags);
    } else {
      postContent = caption || body || '';
    }

    // Get account IDs from env (these should be configured per installation)
    const INSTAGRAM_ACCOUNT_ID = Deno.env.get('INSTAGRAM_ACCOUNT_ID') || '68fb951d8bbca9c10cbfef93';
    const LINKEDIN_ACCOUNT_ID = Deno.env.get('LINKEDIN_ACCOUNT_ID') || 'urn:li:person:ojg2Ri_Otv';

    // Build request body according to Getlate API spec
    const requestBody: any = {
      content: postContent,
      platforms: [
        {
          platform: platform,
          accountId: platform === 'instagram' ? INSTAGRAM_ACCOUNT_ID : LINKEDIN_ACCOUNT_ID,
        },
      ],
      mediaItems: mediaItems.length > 0 ? mediaItems : undefined,
      publishNow: !scheduleAt,
      scheduledFor: scheduleAt || undefined,
      timezone: scheduleAt ? 'UTC' : undefined,
    };

    // Create idempotency key: postId:pages:byteLenHash
    const contentHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify({ postContent, mediaItems: mediaItems.length }))
    );
    const hashArray = Array.from(new Uint8Array(contentHash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8);
    const pagesForKey = (platform === 'linkedin' && postType === 'carousel')
      ? (pdfMetadata?.pages || mediaItems.length || 0)
      : mediaItems.length;
    const idempotencyKey = `${postId}:${pagesForKey}:${hashHex}`;

    console.log('[PUBLISH] Calling Getlate API:', `${GETLATE_BASE_URL}/v1/posts`);
    console.log('[PUBLISH] Media items count:', mediaItems.length);
    console.log('[PUBLISH] Idempotency key:', idempotencyKey);

    const response = await fetchWithRetry(`${GETLATE_BASE_URL}/v1/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GETLATE_TOKEN}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();

    // Handle idempotency conflict (409)
    if (response.status === 409) {
      console.log('[PUBLISH] Idempotency conflict detected');
      return new Response(
        JSON.stringify({
          ok: false,
          stage: 'post',
          code: 409,
          message: 'idempotency-conflict',
          data: responseData,
          meta: { postId, idempotencyKey, baseUrl: GETLATE_BASE_URL },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (!response.ok) {
      console.error('[PUBLISH] Getlate API error:', responseData);
      return new Response(
        JSON.stringify({
          ok: false,
          stage: 'post',
          code: response.status,
          message: responseData?.error || 'Failed to publish to Getlate',
          data: responseData,
          meta: { postId, idempotencyKey, baseUrl: GETLATE_BASE_URL },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log('[PUBLISH] Success:', responseData);

    return new Response(
      JSON.stringify({
        ok: true,
        platform,
        postUrl: responseData.url || null,
        externalId: responseData._id || responseData.id || null,
        data: responseData,
        meta: { postId, idempotencyKey, baseUrl: GETLATE_BASE_URL },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[PUBLISH] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        ok: false,
        stage: 'unknown',
        code: 500,
        message: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
