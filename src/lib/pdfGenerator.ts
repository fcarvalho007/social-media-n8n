import jsPDF from 'jspdf';

export interface CarouselPDFOptions {
  images: string[];
  title?: string;
  quality?: number;
}

/**
 * Generates a PDF from carousel images
 * Each image becomes one page in portrait A4 format
 */
export async function generateCarouselPDF(options: CarouselPDFOptions): Promise<Blob> {
  const { images, title = 'carousel', quality = 0.85 } = options;
  
  if (images.length === 0) {
    throw new Error('No images provided for PDF generation');
  }

  // A4 portrait dimensions in mm
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Load all images first with better error handling
  const loadedImages = await Promise.all(
    images.map(async (imgUrl, index) => {
      return new Promise<{ url: string; img: HTMLImageElement; index: number }>((resolve, reject) => {
        const img = new Image();
        
        // Try with CORS first, fallback to no-cors on error
        img.crossOrigin = 'anonymous';
        
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout loading image ${index + 1}: ${imgUrl}`));
        }, 15000); // 15s timeout per image
        
        img.onload = () => {
          clearTimeout(timeout);
          resolve({ url: imgUrl, img, index });
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          // Retry without CORS
          const img2 = new Image();
          img2.onload = () => resolve({ url: imgUrl, img: img2, index });
          img2.onerror = () => reject(new Error(`Failed to load image ${index + 1}: ${imgUrl}`));
          img2.src = imgUrl;
        };
        
        img.src = imgUrl;
      });
    })
  );

  // Add each image as a page
  loadedImages.forEach(({ img, index }) => {
    if (index > 0) {
      pdf.addPage();
    }

    // Calculate dimensions to fit the page while maintaining aspect ratio
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    const imgAspect = imgWidth / imgHeight;
    const pageAspect = pageWidth / pageHeight;

    let finalWidth = pageWidth;
    let finalHeight = pageHeight;
    let x = 0;
    let y = 0;

    if (imgAspect > pageAspect) {
      // Image is wider - fit to width
      finalHeight = pageWidth / imgAspect;
      y = (pageHeight - finalHeight) / 2;
    } else {
      // Image is taller - fit to height
      finalWidth = pageHeight * imgAspect;
      x = (pageWidth - finalWidth) / 2;
    }

    // Add image to PDF with quality compression
    pdf.addImage(
      img,
      'JPEG',
      x,
      y,
      finalWidth,
      finalHeight,
      undefined,
      'FAST'
    );

    // Add page number at bottom
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(
      `${index + 1} / ${images.length}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  });

  // Generate blob
  const pdfBlob = pdf.output('blob');
  return pdfBlob;
}

/**
 * Validates PDF size and returns warnings
 */
export function validatePDFSize(blob: Blob, pageCount: number): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sizeMB = blob.size / (1024 * 1024);

  // Hard limits
  if (sizeMB > 100) {
    errors.push(`O PDF excede o limite de 100 MB (tamanho atual: ${sizeMB.toFixed(1)} MB)`);
  }

  if (pageCount > 300) {
    errors.push(`O PDF excede o limite de 300 páginas (páginas atuais: ${pageCount})`);
  }

  // Warnings
  if (sizeMB > 30 && sizeMB <= 100) {
    warnings.push(`Tamanho do PDF: ${sizeMB.toFixed(1)} MB (recomendado: ≤30 MB para melhor desempenho)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
