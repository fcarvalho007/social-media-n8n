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
  const { PDF_GENERATION_MODE } = await import('@/config/pdf');
  
  if (PDF_GENERATION_MODE === 'server') {
    throw new Error('Client-side PDF generation is disabled in server mode. Use the server-side edge function instead.');
  }

  const { images, title = 'carousel', quality = 0.85 } = options;
  
  if (images.length === 0) {
    throw new Error('No images provided for PDF generation');
  }

  // Legacy client-side generation (disabled in server mode)
  const jsPDF = (await import('jspdf')).default;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Helper: blob to data URL (avoids tainted canvas)
  const blobToDataURL = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Falha ao ler blob como DataURL'));
    reader.readAsDataURL(blob);
  });

  // Helper: get image natural size from blob via object URL (same-origin)
  const getImageSize = (blob: Blob) => new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao obter dimensões da imagem'));
    };
    img.src = url;
  });

  // Process each image sequentially
  for (let index = 0; index < images.length; index++) {
    const imgUrl = images[index];

    let blob: Blob;
    let dataUrl: string;

    // If already a data URL, parse it directly
    if (imgUrl.startsWith('data:')) {
      dataUrl = imgUrl;
      // Extract mime and base64
      const match = imgUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        throw new Error(`Formato data URL inválido para imagem ${index + 1}`);
      }
      const [, mime, base64] = match;
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: mime });
    } else {
      // Fetch from URL
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      let resp: Response;
      try {
        resp = await fetch(imgUrl, { signal: controller.signal, mode: 'cors' });
      } catch (e) {
        clearTimeout(timeout);
        throw new Error(`Falha ao descarregar a imagem ${index + 1}: ${imgUrl}`);
      }
      clearTimeout(timeout);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} ao descarregar a imagem ${index + 1}: ${imgUrl}`);
      }

      blob = await resp.blob();
      dataUrl = await blobToDataURL(blob);
    }

    const { width: imgWidth, height: imgHeight } = await getImageSize(blob);

    // Nova página
    if (index > 0) {
      pdf.addPage();
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calcular proporções
    const imgAspect = imgWidth / imgHeight;
    const pageAspect = pageWidth / pageHeight;

    let finalWidth = pageWidth;
    let finalHeight = pageHeight;
    let x = 0;
    let y = 0;

    if (imgAspect > pageAspect) {
      finalHeight = pageWidth / imgAspect;
      y = (pageHeight - finalHeight) / 2;
    } else {
      finalWidth = pageHeight * imgAspect;
      x = (pageWidth - finalWidth) / 2;
    }

    // Detectar formato
    const format = (blob.type.includes('png') || imgUrl.toLowerCase().endsWith('.png')) ? 'PNG' : 'JPEG';

    // Adicionar imagem ao PDF
    pdf.addImage(
      dataUrl,
      format,
      x,
      y,
      finalWidth,
      finalHeight,
      undefined,
      'FAST'
    );

    // Número da página
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(
      `${index + 1} / ${images.length}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

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
