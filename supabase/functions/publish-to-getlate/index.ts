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
    });

    const {
      platform,
      postType,
      caption,
      body,
      hashtags,
      media,
      pdfUrl,
      videoUrl,
      scheduleAt,
    } = requestData;

    let apiUrl: string;
    let requestBody: any;

    if (platform === 'instagram') {
      apiUrl = 'https://api.getlate.example/social/instagram/publish';
      
      const finalCaption = `${caption || ''}\n\n${hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`.trim();

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
      apiUrl = 'https://api.getlate.example/social/linkedin/publish';
      
      const finalBody = `${body || caption || ''}\n\n${hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`.trim();

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
          title: requestData.postId,
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
