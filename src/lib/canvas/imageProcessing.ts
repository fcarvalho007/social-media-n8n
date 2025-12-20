/**
 * Image processing utilities for grid detection
 * Uses Canvas API for browser-based image manipulation
 */

export interface CanvasImage {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imageData: ImageData;
  width: number;
  height: number;
}

/**
 * Load an image file into a canvas for processing
 */
export async function loadImageToCanvas(file: File, maxSize = 4000): Promise<CanvasImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Determine if we need to resize
      let width = img.width;
      let height = img.height;
      
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível criar contexto canvas'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);

      resolve({ canvas, ctx, imageData, width, height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível carregar a imagem'));
    };

    img.src = url;
  });
}

/**
 * Convert ImageData to grayscale for analysis
 * Uses luminosity method: 0.299*R + 0.587*G + 0.114*B
 */
export function toGrayscale(imageData: ImageData): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(
      data[i] * 0.299 +      // R
      data[i + 1] * 0.587 +  // G
      data[i + 2] * 0.114    // B
    );
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    // Alpha channel (data[i + 3]) remains unchanged
  }

  return new ImageData(data, imageData.width, imageData.height);
}

/**
 * Apply a simple box blur to reduce noise
 * @param imageData - Input image data (should be grayscale)
 * @param radius - Blur radius (1-5 recommended)
 */
export function applyBoxBlur(imageData: ImageData, radius: number): ImageData {
  if (radius < 1) return imageData;
  
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data);
  const size = radius * 2 + 1;
  const area = size * size;

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      let sumR = 0, sumG = 0, sumB = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          sumR += data[idx];
          sumG += data[idx + 1];
          sumB += data[idx + 2];
        }
      }

      const idx = (y * width + x) * 4;
      output[idx] = Math.round(sumR / area);
      output[idx + 1] = Math.round(sumG / area);
      output[idx + 2] = Math.round(sumB / area);
    }
  }

  return new ImageData(output, width, height);
}

/**
 * Calculate variance for a row of pixels (horizontal line analysis)
 */
export function getRowVariance(imageData: ImageData, y: number): number {
  const { width, data } = imageData;
  const rowStart = y * width * 4;
  
  let sum = 0;
  let sumSq = 0;

  for (let x = 0; x < width; x++) {
    const gray = data[rowStart + x * 4];
    sum += gray;
    sumSq += gray * gray;
  }

  const mean = sum / width;
  return (sumSq / width) - (mean * mean);
}

/**
 * Calculate variance for a column of pixels (vertical line analysis)
 */
export function getColumnVariance(imageData: ImageData, x: number): number {
  const { width, height, data } = imageData;
  
  let sum = 0;
  let sumSq = 0;

  for (let y = 0; y < height; y++) {
    const idx = (y * width + x) * 4;
    const gray = data[idx];
    sum += gray;
    sumSq += gray * gray;
  }

  const mean = sum / height;
  return (sumSq / height) - (mean * mean);
}

/**
 * Get average color at a position (for separator color detection)
 */
export function getAverageColor(
  imageData: ImageData, 
  x: number, 
  y: number, 
  sampleSize = 5
): { r: number; g: number; b: number } {
  const { width, height, data } = imageData;
  const halfSize = Math.floor(sampleSize / 2);
  
  let r = 0, g = 0, b = 0, count = 0;

  for (let dy = -halfSize; dy <= halfSize; dy++) {
    for (let dx = -halfSize; dx <= halfSize; dx++) {
      const px = x + dx;
      const py = y + dy;
      
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = (py * width + px) * 4;
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        count++;
      }
    }
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  };
}

/**
 * Convert RGB to hex color string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
