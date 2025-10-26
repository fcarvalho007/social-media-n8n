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
  pages: number;
  sizeMB: number;
  stage?: string;
  message?: string;
  details?: Array<{
    index: number;
    url: string;
    reason: string;
  }>;
}

const MAX_PAGES = 300;
const MAX_SIZE_MB = 100;
const IMAGE_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const GETLATE_API_URL = 'https://api.getlate.io/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images, title, pageAlts, postId }: GeneratePDFRequest = await req.json();

    // 1. Input validation (fail fast)
    if (!images || !Array.isArray(images) || images.length < 2) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          stage: 'validation',
          message: 'Carousel requires at least 2 images',
          details: []
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          message: `Too many pages. Maximum ${MAX_PAGES} pages allowed, got ${images.length}`,
          details: []
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PDF-GEN] Starting PDF generation for ${images.length} images`);

    // 2. Validate each URL (200 + Content-Type: image/*)
    console.log('[PDF-GEN] Validating image URLs...');
    const validationErrors: Array<{ index: number; url: string; reason: string }> = [];
    
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

        const headResponse = await fetch(imageUrl, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!headResponse.ok) {
          validationErrors.push({
            index: i,
            url: imageUrl,
            reason: `http-${headResponse.status}`
          });
          continue;
        }

        const contentType = headResponse.headers.get('Content-Type') || '';
        if (!contentType.startsWith('image/')) {
          validationErrors.push({
            index: i,
            url: imageUrl,
            reason: `unsupported-mime: ${contentType}`
          });
        }
      } catch (error) {
        validationErrors.push({
          index: i,
          url: imageUrl,
          reason: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'fetch-error'
        });
      }
    }

    if (validationErrors.length > 0) {
      console.error('[PDF-GEN] Validation failed', validationErrors);
      return new Response(
        JSON.stringify({ 
          ok: false,
          stage: 'fetch',
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

      // Retry logic for fetching images
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
            const delay = Math.pow(2, attempt) * 1000;
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

    // Generate PDF as base64
    const pdfBytes = await pdfDoc.save();
    
    // Convert to base64 in chunks to avoid stack overflow with large PDFs
    let pdfBase64 = '';
    const chunkSize = 8192;
    for (let i = 0; i < pdfBytes.length; i += chunkSize) {
      const chunk = pdfBytes.slice(i, i + chunkSize);
      pdfBase64 += String.fromCharCode(...chunk);
    }
    pdfBase64 = btoa(pdfBase64);
    
    const sizeMB = pdfBytes.length / (1024 * 1024);

    // Validate size
    if (sizeMB > MAX_SIZE_MB) {
      console.error(`[PDF-GEN] PDF too large: ${sizeMB.toFixed(2)} MB`);
      return new Response(
        JSON.stringify({ 
          ok: false,
          stage: 'compose',
          message: `PDF size ${sizeMB.toFixed(2)} MB exceeds maximum ${MAX_SIZE_MB} MB`,
          pages: images.length,
          sizeMB: parseFloat(sizeMB.toFixed(2))
        }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PDF-GEN] PDF generated successfully: ${images.length} pages, ${sizeMB.toFixed(2)} MB`);

    // 3. Upload to Getlate if sizeMB >= 20 (preferred path for very large PDFs)
    // For PDFs between 5-20MB, return base64 to avoid CPU timeout
    if (sizeMB >= 20) {
      console.log('[PDF-GEN] Uploading PDF to Getlate (>= 20 MB)...');
      const apiToken = Deno.env.get('GETLATE_API_TOKEN');
      
      if (!apiToken) {
        console.error('[PDF-GEN] GETLATE_API_TOKEN not configured');
        return new Response(
          JSON.stringify({ 
            ok: false,
            stage: 'upload',
            message: 'Getlate API token not configured',
            details: []
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const formData = new FormData();
        // Use Uint8Array directly, which is accepted as BlobPart
        const pdfBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        formData.append('file', pdfBlob, `${postId || title || 'carousel'}.pdf`);

        const uploadResponse = await fetch(`${GETLATE_API_URL}/media`, {
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

        console.log('[PDF-GEN] PDF uploaded to Getlate successfully:', pdfUrl);

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
            message: error instanceof Error ? error.message : 'Failed to upload PDF to Getlate',
            details: []
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback: return base64 for PDFs < 20 MB
    console.log('[PDF-GEN] Returning base64 (< 20 MB)');
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
    console.error('[PDF-GEN] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false,
        stage: 'unknown',
        message: error instanceof Error ? error.message : 'Internal server error',
        details: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
