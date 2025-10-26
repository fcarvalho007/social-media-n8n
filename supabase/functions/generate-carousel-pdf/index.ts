import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { PDFDocument, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePDFRequest {
  images: string[];
  title: string;
  pageAlts?: string[];
  postId?: string;
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
const IMAGE_TIMEOUT_MS = 15000; // 15s per image
const MAX_RETRIES = 2;
const IMAGE_CONCURRENCY = 3;
const GLOBAL_TIMEOUT_MS = 90000; // 90s total job timeout
const GETLATE_BASE_URL = Deno.env.get('GETLATE_BASE_URL') || 'https://getlate.dev/api';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const globalStartTime = Date.now();

  try {
    const { images, title, pageAlts, postId }: GeneratePDFRequest = await req.json();

    // 1. Input validation (fail fast)
    if (!images || !Array.isArray(images) || images.length < 2) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          stage: 'validation',
          code: 422,
          message: 'LinkedIn carousel requires at least 2 pages',
          details: []
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for null/empty URLs
    const invalidUrls = images.map((url, idx) => ({ idx, url }))
      .filter(({ url }) => !url || url.trim() === '');
    if (invalidUrls.length > 0) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          stage: 'validation',
          code: 400,
          message: 'Some image URLs are empty or null',
          details: invalidUrls.map(({ idx, url }) => ({
            index: idx,
            url: url || '',
            reason: 'empty-url'
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicates
    const uniqueUrls = new Set(images);
    if (uniqueUrls.size !== images.length) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          stage: 'validation',
          code: 400,
          message: 'Duplicate image URLs detected',
          details: []
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (images.length > MAX_PAGES) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          stage: 'validation',
          code: 422,
          message: `Too many pages. Maximum ${MAX_PAGES} pages allowed, got ${images.length}`,
          details: []
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PDF-GEN] Starting PDF generation for ${images.length} images`);

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
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
            stage: 'validation',
            code: 415,
            message: 'WEBP not supported by pdf-lib',
            details: webpErrors
          }),
          { status: 415, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PDF-GEN] All images validated successfully');

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // A4 dimensions in points (1 point = 1/72 inch)
    const pageWidth = 595.28; // A4 width in points
    const pageHeight = 841.89; // A4 height in points
    const margin = 28.35; // 10mm in points

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
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add a new page
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      // Calculate image dimensions to fit page while maintaining aspect ratio
      const imgWidth = image.width;
      const imgHeight = image.height;
      const imgAspect = imgWidth / imgHeight;

      const maxWidth = pageWidth - 2 * margin;
      const maxHeight = pageHeight - 2 * margin - 42.52; // Reserve space for page number (15mm)

      let finalWidth = maxWidth;
      let finalHeight = finalWidth / imgAspect;

      if (finalHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = finalHeight * imgAspect;
      }

      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight - 42.52) / 2;

      // Draw image on page
      page.drawImage(image, {
        x,
        y,
        width: finalWidth,
        height: finalHeight,
      });

      // Add page number at bottom
      const pageNumberText = `${i + 1} / ${images.length}`;
      const fontSize = 10;
      page.drawText(pageNumberText, {
        x: pageWidth / 2 - (pageNumberText.length * fontSize * 0.3) / 2,
        y: 14.17, // 5mm from bottom
        size: fontSize,
        color: rgb(0.5, 0.5, 0.5),
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
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Upload to Getlate if sizeMB >= 20 (preferred path for very large PDFs)
    // For PDFs < 20MB, return base64 to avoid CPU timeout on conversion
    if (sizeMB >= 20) {
      console.log('[PDF-GEN] Uploading PDF to Getlate (>= 20 MB)...');
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
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const formData = new FormData();
        const pdfBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        const filename = `${postId || title || 'carousel'}.pdf`;
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
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback: return base64 for PDFs < 20 MB (convert in chunks to avoid CPU timeout)
    console.log('[PDF-GEN] Converting PDF to base64 (< 20 MB)...');
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
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        details: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
