import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  pageAlts?: string[]; // Alt text for each PDF page
  pdfMetadata?: { sizeMB: number; pages: number };
  // Video
  videoUrl?: string;
  scheduleAt?: string;
}

// Server-side validation
function validateRequest(req: PublishRequest): string[] {
  const errors: string[] = [];
  const { platform, postType, caption, body, hashtags, images, pdfUrl, pdfMetadata, videoUrl } = req;

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
      if (!pdfUrl) {
        errors.push('LI carousel requires pdfUrl');
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

    const requestData: PublishRequest = await req.json();
    console.log('[PUBLISH] Request:', {
      postId: requestData.postId,
      platform: requestData.platform,
      postType: requestData.postType,
      timestamp: new Date().toISOString(),
    });

    // Server-side validation
    const validationErrors = validateRequest(requestData);
    if (validationErrors.length > 0) {
      console.error('[PUBLISH] Validation failed:', validationErrors);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          details: validationErrors,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
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
      pageAlts,
      pdfMetadata,
      videoUrl,
      scheduleAt,
    } = requestData;

    console.log('[PUBLISH] Processing:', {
      platform,
      postType,
      hasImages: !!images,
      imageCount: images?.length,
      hasPdf: !!pdfUrl,
      pdfMetadata,
    });

    // Deduplicate hashtags
    const hashtags = deduplicateHashtags(rawHashtags);

    let apiUrl: string;
    let requestBody: any;

    if (platform === 'instagram') {
      apiUrl = 'https://api.getlate.co/v1/social/instagram/posts';
      
      const finalCaption = `${caption || ''}\n\n${hashtags.join(' ')}`.trim();

      // Instagram carousel: send native images (not PDF)
      if (postType === 'carousel' && images && images.length > 0) {
        console.log('[PUBLISH] Instagram carousel with', images.length, 'images');
        
        const imagePromises = images.map(async (imgUrl) => {
          const imgResponse = await fetch(imgUrl);
          const imgBlob = await imgResponse.blob();
          const imgBuffer = await imgBlob.arrayBuffer();
          return {
            kind: 'image',
            file: Array.from(new Uint8Array(imgBuffer)),
          };
        });
        const imageData = await Promise.all(imagePromises);

        requestBody = {
          accountId: '68fb951d8bbca9c10cbfef93',
          type: 'carousel',
          caption: finalCaption,
          media: imageData,
          scheduleAt: scheduleAt || null,
        };
      } else if (postType === 'video' && videoUrl) {
        const videoResponse = await fetch(videoUrl);
        const videoBlob = await videoResponse.blob();
        const videoBuffer = await videoBlob.arrayBuffer();
        
        requestBody = {
          accountId: '68fb951d8bbca9c10cbfef93',
          type: 'video',
          caption: finalCaption,
          media: [{
            kind: 'video',
            file: Array.from(new Uint8Array(videoBuffer)),
          }],
          scheduleAt: scheduleAt || null,
        };
      } else if (images && images.length > 0) {
        // Single image
        const imgResponse = await fetch(images[0]);
        const imgBlob = await imgResponse.blob();
        const imgBuffer = await imgBlob.arrayBuffer();
        
        requestBody = {
          accountId: '68fb951d8bbca9c10cbfef93',
          type: 'image',
          caption: finalCaption,
          media: [{
            kind: 'image',
            file: Array.from(new Uint8Array(imgBuffer)),
          }],
          scheduleAt: scheduleAt || null,
        };
      }
    } else if (platform === 'linkedin') {
      apiUrl = 'https://api.getlate.co/v1/social/linkedin/posts';
      
      // Format body with URLs at the end
      const textWithHashtags = `${body || caption || ''}\n\n${hashtags.join(' ')}`.trim();
      const finalBody = formatLinkedInBody(textWithHashtags);

      requestBody = {
        memberUrn: 'urn:li:person:ojg2Ri_Otv',
        visibility: 'PUBLIC',
        content: {
          text: finalBody,
        },
        scheduleAt: scheduleAt || null,
      };

      // LinkedIn carousel: send as PDF document
      if (postType === 'carousel' && pdfUrl) {
        console.log('[PUBLISH] LinkedIn document with', pdfMetadata?.pages, 'pages,', pdfMetadata?.sizeMB?.toFixed(2), 'MB');
        
        const pdfResponse = await fetch(pdfUrl);
        const pdfBlob = await pdfResponse.blob();
        const pdfBuffer = await pdfBlob.arrayBuffer();
        
        requestBody.content.kind = 'document';
        requestBody.content.document = {
          file: Array.from(new Uint8Array(pdfBuffer)),
          title: postId,
          pageAlts: pageAlts || [],
        };
      } else if (postType === 'video' && videoUrl) {
        const videoResponse = await fetch(videoUrl);
        const videoBlob = await videoResponse.blob();
        const videoBuffer = await videoBlob.arrayBuffer();
        
        requestBody.content.kind = 'video';
        requestBody.content.video = {
          file: Array.from(new Uint8Array(videoBuffer)),
        };
      } else if (images && images.length > 0) {
        const imagePromises = images.map(async (imgUrl) => {
          const imgResponse = await fetch(imgUrl);
          const imgBlob = await imgResponse.blob();
          const imgBuffer = await imgBlob.arrayBuffer();
          return {
            file: Array.from(new Uint8Array(imgBuffer)),
          };
        });
        requestBody.content.kind = 'image';
        requestBody.content.images = await Promise.all(imagePromises);
      } else {
        requestBody.content.kind = 'text';
      }
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    console.log('[PUBLISH] Calling Getlate API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GETLATE_TOKEN}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': postId, // Prevent duplicate posts
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[PUBLISH] Getlate API error:', responseData);
      throw new Error(responseData.error || 'Failed to publish to Getlate');
    }

    console.log('[PUBLISH] Success:', responseData);

    return new Response(
      JSON.stringify({
        success: true,
        platform,
        postUrl: responseData.postUrl || null,
        externalId: responseData.id || null,
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
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
