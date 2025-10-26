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
}

interface GeneratePDFResponse {
  pdfBase64: string;
  pdfUrl?: string;
  metadata: {
    pages: number;
    sizeMB: number;
    title: string;
  };
  pageAlts: string[];
}

const MAX_PAGES = 300;
const MAX_SIZE_MB = 100;
const IMAGE_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images, title, pageAlts }: GeneratePDFRequest = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'images array is required and must not be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (images.length > MAX_PAGES) {
      return new Response(
        JSON.stringify({ 
          error: `Too many pages. Maximum ${MAX_PAGES} pages allowed, got ${images.length}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PDF-GEN] Starting PDF generation for ${images.length} images`);

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
            error: `Failed to fetch image ${i + 1}: ${lastError?.message || 'Unknown error'}`,
            imageUrl,
            attemptedRetries: MAX_RETRIES,
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
            error: `Failed to embed image ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            imageUrl,
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
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
    const sizeMB = pdfBytes.length / (1024 * 1024);

    // Validate size
    if (sizeMB > MAX_SIZE_MB) {
      return new Response(
        JSON.stringify({ 
          error: `PDF size ${sizeMB.toFixed(2)} MB exceeds maximum ${MAX_SIZE_MB} MB`,
          metadata: { pages: images.length, sizeMB, title },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PDF-GEN] PDF generated successfully: ${images.length} pages, ${sizeMB.toFixed(2)} MB`);

    // Create blob URL for preview (fix TypeScript compatibility)
    const pdfBlob = new Blob([pdfBytes as Uint8Array], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    console.log(`[PDF-GEN] Created PDF URL for preview`);

    const response: GeneratePDFResponse = {
      pdfBase64,
      pdfUrl, // Include URL for preview
      metadata: {
        pages: images.length,
        sizeMB: parseFloat(sizeMB.toFixed(2)),
        title: title || 'carousel',
      },
      pageAlts: generatedAlts,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[PDF-GEN] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
