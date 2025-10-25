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

  // Load all images first
  const loadedImages = await Promise.all(
    images.map(async (imgUrl, index) => {
      return new Promise<{ url: string; img: HTMLImageElement; index: number }>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => resolve({ url: imgUrl, img, index });
        img.onerror = () => reject(new Error(`Failed to load image ${index + 1}`));
        
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
export function validatePDFSize(blob: Blob): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const sizeMB = blob.size / (1024 * 1024);

  if (sizeMB > 30) {
    warnings.push(`PDF size is ${sizeMB.toFixed(1)}MB (max recommended: 30MB)`);
  }

  return {
    valid: sizeMB <= 50, // Hard limit
    warnings,
  };
}
