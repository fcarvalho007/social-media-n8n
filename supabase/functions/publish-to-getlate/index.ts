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
  media?: Array<{ url: string; alt?: string }>;
  pdfUrl?: string;
  videoUrl?: string;
  scheduleAt?: string;
}

// Server-side validation
function validateRequest(req: PublishRequest): string[] {
  const errors: string[] = [];
  const { platform, postType, caption, body, hashtags, media, pdfUrl, videoUrl } = req;

  if (platform === 'instagram') {
    // Caption validation
    if (caption && caption.length > 2200) {
      errors.push(`IG caption exceeds 2200 chars (${caption.length})`);
    }
    
    // Hashtags validation
    if (hashtags.length > 30) {
      errors.push(`IG hashtags exceed 30 (${hashtags.length})`);
    }
    
    // Carousel validation
    if (postType === 'carousel') {
      const imageCount = media?.length || 0;
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
    if (postType === 'carousel' && pdfUrl) {
      // LinkedIn accepts up to 300 pages, but we validate reasonable size
      // Actual PDF size validation should happen before upload
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
      media,
      pdfUrl,
      videoUrl,
      scheduleAt,
    } = requestData;

    // Deduplicate hashtags
    const hashtags = deduplicateHashtags(rawHashtags);

    let apiUrl: string;
    let requestBody: any;

    if (platform === 'instagram') {
      apiUrl = 'https://api.getlate.co/v1/social/instagram/posts';
      
      const finalCaption = `${caption || ''}\n\n${hashtags.join(' ')}`.trim();

      requestBody = {
        accountId: '68fb951d8bbca9c10cbfef93',
        type: postType === 'carousel' ? 'document' : postType === 'video' ? 'video' : 'image',
        caption: finalCaption,
        scheduleAt: scheduleAt || null,
      };

      if (postType === 'carousel' && pdfUrl) {
        // Download PDF and convert to binary
        const pdfResponse = await fetch(pdfUrl);
        const pdfBlob = await pdfResponse.blob();
        const pdfBuffer = await pdfBlob.arrayBuffer();
        
        requestBody.document = {
          file: Array.from(new Uint8Array(pdfBuffer)),
          filename: 'carousel.pdf',
        };
      } else if (postType === 'video' && videoUrl) {
        const videoResponse = await fetch(videoUrl);
        const videoBlob = await videoResponse.blob();
        const videoBuffer = await videoBlob.arrayBuffer();
        
        requestBody.media = [{
          kind: 'video',
          file: Array.from(new Uint8Array(videoBuffer)),
        }];
      } else if (media && media.length > 0) {
        const imagePromises = media.map(async (m) => {
          const imgResponse = await fetch(m.url);
          const imgBlob = await imgResponse.blob();
          const imgBuffer = await imgBlob.arrayBuffer();
          return {
            kind: 'image',
            file: Array.from(new Uint8Array(imgBuffer)),
          };
        });
        requestBody.media = await Promise.all(imagePromises);
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

      if (postType === 'carousel' && pdfUrl) {
        const pdfResponse = await fetch(pdfUrl);
        const pdfBlob = await pdfResponse.blob();
        const pdfBuffer = await pdfBlob.arrayBuffer();
        
        requestBody.content.kind = 'document';
        requestBody.content.document = {
          file: Array.from(new Uint8Array(pdfBuffer)),
          title: postId, // Use postId as document title
        };
      } else if (postType === 'video' && videoUrl) {
        const videoResponse = await fetch(videoUrl);
        const videoBlob = await videoResponse.blob();
        const videoBuffer = await videoBlob.arrayBuffer();
        
        requestBody.content.kind = 'video';
        requestBody.content.video = {
          file: Array.from(new Uint8Array(videoBuffer)),
        };
      } else if (media && media.length > 0) {
        const imagePromises = media.map(async (m) => {
          const imgResponse = await fetch(m.url);
          const imgBlob = await imgResponse.blob();
          const imgBuffer = await imgBlob.arrayBuffer();
          return {
            file: Array.from(new Uint8Array(imgBuffer)),
            alt: m.alt || '',
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
