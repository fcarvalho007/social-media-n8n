import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePDFRequest {
  images: string[];
  title: string;
  pageAlts?: string[];
  postId?: string;
  caption?: string;
}

// Generate semantic filename from caption
function generateSemanticFilename(caption: string | undefined, date: Date = new Date()): string {
  const stopwords = ['a', 'o', 'e', 'de', 'da', 'do', 'para', 'com', 'em', 'que', 'é', 'mais', 'uma', 'um', 'os', 'as', 'no', 'na', 'por', 'se', 'ou', 'ao', 'aos', 'das', 'dos', 'seu', 'sua', 'como', 'mas', 'não', 'nao', 'isso', 'esta', 'este', 'essa', 'esse', 'aqui', 'ali', 'muito', 'pode', 'ser', 'ter', 'tem', 'está', 'era', 'são', 'foi', 'vai', 'cada', 'todos', 'toda', 'todas'];
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  if (!caption || caption.trim().length === 0) {
    return `carousel-${month}-${year}.pdf`;
  }
  
  // Remove emojis, hashtags, URLs, mentions
  let cleaned = caption
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/#\w+/g, '')
    .replace(/@\w+/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .toLowerCase();
  
  // Normalize (remove accents)
  cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Extract words (only alphabetic, min 3 chars, not in stopwords)
  const words = cleaned
    .split(/\s+/)
    .map(w => w.replace(/[^a-z]/g, ''))
    .filter(w => w.length >= 3 && !stopwords.includes(w))
    .slice(0, 4);
  
  const slug = words.join('-').substring(0, 40) || 'carousel';
  
  return `${slug}-${month}-${year}-carousel.pdf`;
}

interface GeneratePDFResponse {
  ok: boolean;
  pdfUrl?: string;
  pdfBase64?: string;
  pages?: number;
  sizeMB?: number;
  stage?: string;
  code?: number;
  message?: string;
  details?: Array<{
    index: number;
    url: string;
    reason: string;
  }>;
}

const MAX_PAGES = 300;
const MAX_SIZE_MB = 100;
const MAX_INDIVIDUAL_IMAGE_MB = 50; // 50MB per image
const IMAGE_TIMEOUT_MS = 30000; // 30s per image (increased for larger images)
const MAX_RETRIES = 2;
const IMAGE_CONCURRENCY = 3;
const GLOBAL_TIMEOUT_MS = 180000; // 180s total job timeout (increased for larger images)
const GETLATE_BASE_URL = Deno.env.get('GETLATE_BASE_URL') || 'https://getlate.dev/api';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  const globalStartTime = Date.now();

  try {
    const { images, title, pageAlts, postId, caption }: GeneratePDFRequest = await req.json();

    // 1. Input validation (fail fast)
    if (!images || !Array.isArray(images) || images.length < 2) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          stage: 'parse',
          code: 422,
          message: 'LinkedIn carousel requires at least 2 pages',
          details: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for null/empty URLs
    const invalidUrls = images.map((url, idx) => ({ idx, url }))
      .filter(({ url }) => !url || url.trim() === '');
    if (invalidUrls.length > 0) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          stage: 'parse',
          code: 400,
          message: 'Some image URLs are empty or null',
          details: invalidUrls.map(({ idx, url }) => ({
            index: idx,
            url: url || '',
            reason: 'empty-url'
          }))
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicates
    const uniqueUrls = new Set(images);
    if (uniqueUrls.size !== images.length) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          stage: 'parse',
          code: 400,
          message: 'Duplicate image URLs detected',
          details: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (images.length > MAX_PAGES) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          stage: 'parse',
          code: 422,
          message: `Too many pages. Maximum ${MAX_PAGES} pages allowed, got ${images.length}`,
          details: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PDF-GEN] Starting PDF generation for ${images.length} images`);
    console.log(`[PDF-GEN] Limits: ${MAX_PAGES} pages max, ${MAX_SIZE_MB}MB total, ${MAX_INDIVIDUAL_IMAGE_MB}MB per image`);
    console.log(`[PDF-GEN] Timeouts: ${IMAGE_TIMEOUT_MS}ms per image, ${GLOBAL_TIMEOUT_MS}ms global`);

    // Track total estimated size
    let totalEstimatedSizeMB = 0;

    // 2. Validate each URL (200 + Content-Type: image/*) with concurrency
    console.log('[PDF-GEN] Validating image URLs...');
    const validationErrors: Array<{ index: number; url: string; reason: string }> = [];
    
    // Helper to validate single image with fallback
    const validateImage = async (imageUrl: string, index: number) => {
      // Check global timeout
      if (Date.now() - globalStartTime > GLOBAL_TIMEOUT_MS) {
        throw new Error('global-timeout');
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

        // Try HEAD first
        let headResponse = await fetch(imageUrl, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        let contentType = headResponse.headers.get('Content-Type') || '';

        // Fallback to GET with Range if HEAD fails or has no/invalid Content-Type
        if (!headResponse.ok || !contentType.startsWith('image/')) {
          console.log(`[PDF-GEN] HEAD failed for image ${index + 1}, trying GET with Range...`);
          
          const getRangeController = new AbortController();
          const getRangeTimeoutId = setTimeout(() => getRangeController.abort(), IMAGE_TIMEOUT_MS);

          const getRangeResponse = await fetch(imageUrl, {
            method: 'GET',
            headers: { 'Range': 'bytes=0-0' },
            signal: getRangeController.signal,
          });

          clearTimeout(getRangeTimeoutId);
          
          contentType = getRangeResponse.headers.get('Content-Type') || '';
          headResponse = getRangeResponse;
        }

        if (!headResponse.ok) {
          return {
            index,
            url: imageUrl,
            reason: `http-${headResponse.status}`
          };
        }

        // Check Content-Length for size validation
        const contentLength = headResponse.headers.get('Content-Length');
        if (contentLength) {
          const sizeMB = parseInt(contentLength, 10) / (1024 * 1024);
          console.log(`[PDF-GEN] Image ${index + 1} size: ${sizeMB.toFixed(2)}MB`);
          
          if (sizeMB > MAX_INDIVIDUAL_IMAGE_MB) {
            return {
              index,
              url: imageUrl,
              reason: `size-exceeded: ${sizeMB.toFixed(1)}MB > ${MAX_INDIVIDUAL_IMAGE_MB}MB`
            };
          }
        }

        // Check if WEBP (not supported by pdf-lib)
        if (contentType.includes('webp')) {
          return {
            index,
            url: imageUrl,
            reason: 'unsupported-webp'
          };
        }

        // Check if valid image type
        if (!contentType.startsWith('image/')) {
          return {
            index,
            url: imageUrl,
            reason: `unsupported-mime: ${contentType}`
          };
        }

        return null; // Success
      } catch (error) {
        if (error instanceof Error && error.message === 'global-timeout') {
          throw error;
        }
        return {
          index,
          url: imageUrl,
          reason: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'fetch-error'
        };
      }
    };

    // Validate images with concurrency limit
    try {
      for (let i = 0; i < images.length; i += IMAGE_CONCURRENCY) {
        const batch = images.slice(i, i + IMAGE_CONCURRENCY);
        const results = await Promise.all(
          batch.map((url, batchIdx) => validateImage(url, i + batchIdx))
        );
        
        const errors = results.filter((r): r is NonNullable<typeof r> => r !== null);
        validationErrors.push(...errors);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'global-timeout') {
        return new Response(
          JSON.stringify({ 
            ok: false,
            stage: 'fetch',
            code: 408,
            message: 'Global timeout exceeded (90s)',
            details: []
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    if (validationErrors.length > 0) {
      console.error('[PDF-GEN] Validation failed', validationErrors);
      
      // Special handling for WEBP
      const webpErrors = validationErrors.filter(e => e.reason === 'unsupported-webp');
      if (webpErrors.length > 0) {
        return new Response(
          JSON.stringify({ 
            ok: false,
            stage: 'parse',
            code: 415,
            message: 'WEBP not supported by pdf-lib',
            details: webpErrors
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          ok: false,
          stage: 'fetch',
          code: 400,
          message: `${validationErrors.length} image(s) failed validation`,
          details: validationErrors
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PDF-GEN] All images validated successfully');

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // 4:5 aspect ratio dimensions in points (1 point = 1/72 inch)
    // Width: 595.28 (same as A4), Height: 744.10 (595.28 / 0.8 = 744.10)
    const pageWidth = 595.28;
    const pageHeight = 744.10; // 4:5 aspect ratio
    const margin = 0; // Edge-to-edge, no margins

    // Generate alt texts if not provided
    const generatedAlts = pageAlts || images.map((_, idx) => `Slide ${idx + 1}/${images.length}`);

    // Process each image
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      console.log(`[PDF-GEN] Processing image ${i + 1}/${images.length}: ${imageUrl}`);

      let imageData: ArrayBuffer | null = null;
      let lastError: Error | null = null;

      // Check global timeout
      if (Date.now() - globalStartTime > GLOBAL_TIMEOUT_MS) {
        return new Response(
          JSON.stringify({ 
            ok: false,
            stage: 'fetch',
            code: 408,
            message: 'Global timeout exceeded (90s)',
            details: []
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Retry logic for fetching images with exponential backoff
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

          const response = await fetch(imageUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; CarouselPDFGenerator/1.0)',
            },
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          imageData = await response.arrayBuffer();
          break; // Success
        } catch (error) {
          lastError = error as Error;
          console.error(`[PDF-GEN] Attempt ${attempt + 1} failed for image ${i + 1}:`, error);
          
          if (attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
            console.log(`[PDF-GEN] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!imageData) {
        console.error(`[PDF-GEN] Failed to fetch image ${i + 1} after ${MAX_RETRIES + 1} attempts`);
        return new Response(
          JSON.stringify({ 
            ok: false,
            stage: 'fetch',
            code: 500,
            message: `Failed to fetch image ${i + 1}`,
            details: [{
              index: i,
              url: imageUrl,
              reason: lastError?.message || 'Unknown error'
            }]
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Embed image in PDF
      let image;
      try {
        if (imageUrl.toLowerCase().endsWith('.png')) {
          image = await pdfDoc.embedPng(imageData);
        } else {
          image = await pdfDoc.embedJpg(imageData);
        }
      } catch (error) {
        console.error(`[PDF-GEN] Failed to embed image ${i + 1}:`, error);
        return new Response(
          JSON.stringify({ 
            ok: false,
            stage: 'compose',
            code: 500,
            message: `Failed to embed image ${i + 1}`,
            details: [{
              index: i,
              url: imageUrl,
              reason: error instanceof Error ? error.message : 'Unknown error'
            }]
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add a new page
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      // Calculate image dimensions to fill page edge-to-edge (cover mode)
      const imgWidth = image.width;
      const imgHeight = image.height;
      const imgAspect = imgWidth / imgHeight;
      const pageAspect = pageWidth / pageHeight;

      let finalWidth: number;
      let finalHeight: number;
      let x: number;
      let y: number;

      // Scale to cover the entire page
      if (imgAspect > pageAspect) {
        // Image is wider - fit height, center horizontally (may crop sides)
        finalHeight = pageHeight;
        finalWidth = pageHeight * imgAspect;
        x = (pageWidth - finalWidth) / 2;
        y = 0;
      } else {
        // Image is taller - fit width, center vertically (may crop top/bottom)
        finalWidth = pageWidth;
        finalHeight = pageWidth / imgAspect;
        x = 0;
        y = (pageHeight - finalHeight) / 2;
      }

      // Draw image on page (edge-to-edge, no page numbers)
      page.drawImage(image, {
        x,
        y,
        width: finalWidth,
        height: finalHeight,
      });

      console.log(`[PDF-GEN] Successfully added image ${i + 1}/${images.length}`);
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const sizeMB = pdfBytes.length / (1024 * 1024);
    
    console.log(`[PDF-GEN] PDF generated successfully: ${images.length} pages, ${sizeMB.toFixed(2)} MB`);

    // Validate size
    if (sizeMB > MAX_SIZE_MB) {
      console.error(`[PDF-GEN] PDF too large: ${sizeMB.toFixed(2)} MB`);
      return new Response(
        JSON.stringify({ 
          ok: false,
          stage: 'compose',
          code: 413,
          message: `PDF size ${sizeMB.toFixed(2)} MB exceeds maximum ${MAX_SIZE_MB} MB`,
          pages: images.length,
          sizeMB: parseFloat(sizeMB.toFixed(2))
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Upload to Getlate if sizeMB >= 5 (preferred path)
    // For PDFs < 5MB, return base64
    if (sizeMB >= 5) {
      console.log(`[PDF-GEN] Uploading PDF to Getlate (${sizeMB.toFixed(2)} MB >= 5 MB)...`);
      const apiToken = Deno.env.get('GETLATE_API_TOKEN');
      
      if (!apiToken) {
        console.error('[PDF-GEN] GETLATE_API_TOKEN not configured');
        return new Response(
          JSON.stringify({ 
            ok: false,
            stage: 'upload',
            code: 500,
            message: 'Getlate API token not configured',
            details: []
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

try {
        const formData = new FormData();
        const pdfBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        // Generate semantic filename from caption
        const filename = generateSemanticFilename(caption);
        formData.append('file', pdfBlob, filename);

        console.log(`[PDF-GEN] Uploading to ${GETLATE_BASE_URL}/v1/media (${filename})`);

        const uploadResponse = await fetch(`${GETLATE_BASE_URL}/v1/media`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('[PDF-GEN] Getlate upload failed:', uploadResponse.status, errorText);
          throw new Error(`Upload failed: ${uploadResponse.status}`);
        }

        const uploadData = await uploadResponse.json();
        const pdfUrl = uploadData.url;

        if (!pdfUrl) {
          console.error('[PDF-GEN] No URL in Getlate response:', uploadData);
          throw new Error('No URL returned from Getlate');
        }

        console.log('[PDF-GEN] PDF uploaded successfully');

        const response: GeneratePDFResponse = {
          ok: true,
          pdfUrl,
          pages: images.length,
          sizeMB: parseFloat(sizeMB.toFixed(2)),
        };

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('[PDF-GEN] Failed to upload to Getlate:', error);
        return new Response(
          JSON.stringify({ 
            ok: false,
            stage: 'upload',
            code: 500,
            message: error instanceof Error ? error.message : 'Failed to upload PDF to Getlate',
            details: []
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback: return base64 for PDFs < 5 MB
    console.log(`[PDF-GEN] Converting PDF to base64 (${sizeMB.toFixed(2)} MB < 5 MB)...`);
    try {
      let pdfBase64 = '';
      const chunkSize = 8192;
      for (let i = 0; i < pdfBytes.length; i += chunkSize) {
        const chunk = pdfBytes.slice(i, i + chunkSize);
        pdfBase64 += String.fromCharCode(...chunk);
      }
      pdfBase64 = btoa(pdfBase64);
      
      console.log(`[PDF-GEN] Base64 conversion complete (${(pdfBase64.length / 1024).toFixed(0)} KB)`);

      const response: GeneratePDFResponse = {
        ok: true,
        pdfBase64,
        pages: images.length,
        sizeMB: parseFloat(sizeMB.toFixed(2)),
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[PDF-GEN] Base64 conversion failed:', error);
      return new Response(
        JSON.stringify({ 
          ok: false,
          stage: 'compose',
          code: 500,
          message: 'Failed to convert PDF to base64',
          details: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[PDF-GEN] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false,
        stage: 'unknown',
        code: 500,
        message: error instanceof Error ? error.message : 'Internal server error',
        details: [],
        meta: { edge: 'generate-carousel-pdf', ts: new Date().toISOString() }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
