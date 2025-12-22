/**
 * Aspect ratio crop utilities for precise image cutting
 */

export interface CropResult {
  canvas: HTMLCanvasElement;
  cropInfo: {
    originalWidth: number;
    originalHeight: number;
    croppedWidth: number;
    croppedHeight: number;
    offsetX: number;
    offsetY: number;
  };
}

/**
 * Crop an image to a specific aspect ratio, centering the crop
 */
export function cropToAspectRatio(
  sourceCanvas: HTMLCanvasElement,
  targetRatio: number = 3 / 4 // 3:4 for Instagram (width/height)
): CropResult {
  const { width, height } = sourceCanvas;
  const currentRatio = width / height;

  let cropWidth: number;
  let cropHeight: number;
  let offsetX = 0;
  let offsetY = 0;

  if (currentRatio > targetRatio) {
    // Image is too wide - crop sides
    cropHeight = height;
    cropWidth = Math.round(height * targetRatio);
    offsetX = Math.round((width - cropWidth) / 2);
  } else if (currentRatio < targetRatio) {
    // Image is too tall - crop top/bottom
    cropWidth = width;
    cropHeight = Math.round(width / targetRatio);
    offsetY = Math.round((height - cropHeight) / 2);
  } else {
    // Already correct ratio
    cropWidth = width;
    cropHeight = height;
  }

  // Create new canvas with target aspect ratio
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;
  
  const ctx = croppedCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  // Draw the cropped region
  ctx.drawImage(
    sourceCanvas,
    offsetX, offsetY, cropWidth, cropHeight,
    0, 0, cropWidth, cropHeight
  );

  return {
    canvas: croppedCanvas,
    cropInfo: {
      originalWidth: width,
      originalHeight: height,
      croppedWidth: cropWidth,
      croppedHeight: cropHeight,
      offsetX,
      offsetY,
    },
  };
}

/**
 * Load an image file into a canvas
 */
export function loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Load image from URL into canvas
 */
export function loadImageUrlToCanvas(imageUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image from URL'));
    };

    img.src = imageUrl;
  });
}
