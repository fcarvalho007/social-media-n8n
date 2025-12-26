/**
 * Instagram Auto-Resize with Margins (Letterbox/Pillarbox)
 * 
 * This module handles automatic resizing of images to fit Instagram's
 * aspect ratio requirements without cropping or distorting the original content.
 * Instead, it adds margins (black or white) to achieve the target ratio.
 */

// Instagram aspect ratio limits
const INSTAGRAM_MIN_RATIO = 0.8;  // 4:5 (portrait) - minimum allowed
const INSTAGRAM_MAX_RATIO = 1.91; // landscape - maximum allowed
const TARGET_WIDTH = 1080;

export interface InstagramResizeResult {
  file: File;
  wasResized: boolean;
  originalRatio: number;
  newRatio: number;
  message?: string;
}

export interface AspectRatioAnalysis {
  needsResize: boolean;
  originalRatio: number;
  targetRatio: number;
  type: 'pillarbox' | 'letterbox' | 'none';
  message?: string;
}

/**
 * Analyze if an image needs Instagram resize
 */
export function analyzeInstagramAspectRatio(width: number, height: number): AspectRatioAnalysis {
  const ratio = width / height;
  
  if (ratio >= INSTAGRAM_MIN_RATIO && ratio <= INSTAGRAM_MAX_RATIO) {
    return {
      needsResize: false,
      originalRatio: ratio,
      targetRatio: ratio,
      type: 'none',
    };
  }
  
  if (ratio < INSTAGRAM_MIN_RATIO) {
    // Image is too tall (portrait) - needs pillarbox (side margins)
    return {
      needsResize: true,
      originalRatio: ratio,
      targetRatio: INSTAGRAM_MIN_RATIO,
      type: 'pillarbox',
      message: `Imagem muito alta (${ratio.toFixed(2)}:1). Serão adicionadas margens laterais.`,
    };
  }
  
  // Image is too wide (landscape) - needs letterbox (top/bottom margins)
  return {
    needsResize: true,
    originalRatio: ratio,
    targetRatio: INSTAGRAM_MAX_RATIO,
    type: 'letterbox',
    message: `Imagem muito larga (${ratio.toFixed(2)}:1). Serão adicionadas margens superior/inferior.`,
  };
}

/**
 * Check if an image needs Instagram resize based on dimensions
 */
export function needsInstagramResize(width: number, height: number): boolean {
  const ratio = width / height;
  return ratio < INSTAGRAM_MIN_RATIO || ratio > INSTAGRAM_MAX_RATIO;
}

/**
 * Get image dimensions from a File
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível carregar a imagem'));
    };
    
    img.src = url;
  });
}

/**
 * Resize an image for Instagram by adding margins (letterbox/pillarbox)
 * without cropping or distorting the original content.
 * 
 * @param file - The image file to resize
 * @param backgroundColor - Color for margins (default: white)
 * @returns Promise with the resized file and metadata
 */
export async function resizeForInstagram(
  file: File,
  backgroundColor: string = '#FFFFFF'
): Promise<InstagramResizeResult> {
  // Skip non-image files
  if (!file.type.startsWith('image/')) {
    return {
      file,
      wasResized: false,
      originalRatio: 0,
      newRatio: 0,
      message: 'Não é uma imagem',
    };
  }
  
  const { width, height } = await getImageDimensions(file);
  const analysis = analyzeInstagramAspectRatio(width, height);
  
  // If no resize needed, return original
  if (!analysis.needsResize) {
    return {
      file,
      wasResized: false,
      originalRatio: analysis.originalRatio,
      newRatio: analysis.originalRatio,
    };
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      try {
        let canvasWidth: number;
        let canvasHeight: number;
        let drawX: number;
        let drawY: number;
        
        if (analysis.type === 'pillarbox') {
          // Image too tall: add side margins to achieve target ratio
          // New width = height * target_ratio
          canvasWidth = Math.ceil(height * INSTAGRAM_MIN_RATIO);
          canvasHeight = height;
          drawX = Math.round((canvasWidth - width) / 2);
          drawY = 0;
        } else {
          // Image too wide: add top/bottom margins
          // New height = width / target_ratio
          canvasWidth = width;
          canvasHeight = Math.ceil(width / INSTAGRAM_MAX_RATIO);
          drawX = 0;
          drawY = Math.round((canvasHeight - height) / 2);
        }
        
        // Create canvas with new dimensions
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }
        
        // Fill with background color
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw original image centered
        ctx.drawImage(img, drawX, drawY, width, height);
        
        // If canvas is larger than target width, resize down
        let finalCanvas = canvas;
        if (canvasWidth > TARGET_WIDTH) {
          const scale = TARGET_WIDTH / canvasWidth;
          const resizedCanvas = document.createElement('canvas');
          resizedCanvas.width = TARGET_WIDTH;
          resizedCanvas.height = Math.round(canvasHeight * scale);
          
          const resizedCtx = resizedCanvas.getContext('2d');
          if (resizedCtx) {
            resizedCtx.imageSmoothingEnabled = true;
            resizedCtx.imageSmoothingQuality = 'high';
            resizedCtx.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
            finalCanvas = resizedCanvas;
          }
        }
        
        // Convert to blob
        finalCanvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Não foi possível criar blob da imagem'));
              return;
            }
            
            // Create new file with same name
            const newFileName = file.name.replace(/\.[^.]+$/, '-ig.jpg');
            const newFile = new File([blob], newFileName, { type: 'image/jpeg' });
            
            const newRatio = finalCanvas.width / finalCanvas.height;
            
            resolve({
              file: newFile,
              wasResized: true,
              originalRatio: analysis.originalRatio,
              newRatio,
              message: analysis.message,
            });
          },
          'image/jpeg',
          0.92 // High quality
        );
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível carregar a imagem'));
    };
    
    img.src = url;
  });
}

/**
 * Process multiple media files for Instagram, resizing those that need it.
 * 
 * @param files - Array of media files
 * @param hasInstagramFormat - Whether Instagram is selected
 * @param onProgress - Optional callback for progress updates
 * @returns Promise with processed files
 */
export async function processMediaForInstagram(
  files: File[],
  hasInstagramFormat: boolean,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<{ files: File[]; resizedCount: number }> {
  // If no Instagram format selected, return original files
  if (!hasInstagramFormat) {
    return { files, resizedCount: 0 };
  }
  
  const processedFiles: File[] = [];
  let resizedCount = 0;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Only process images
    if (!file.type.startsWith('image/')) {
      processedFiles.push(file);
      continue;
    }
    
    onProgress?.(i + 1, files.length, `A otimizar imagem ${i + 1} de ${files.length}...`);
    
    try {
      const result = await resizeForInstagram(file);
      processedFiles.push(result.file);
      if (result.wasResized) {
        resizedCount++;
      }
    } catch (error) {
      console.error(`[instagramResize] Error processing file ${file.name}:`, error);
      // On error, keep original file
      processedFiles.push(file);
    }
  }
  
  return { files: processedFiles, resizedCount };
}

/**
 * Analyze multiple files and return which ones need resizing
 */
export async function analyzeFilesForInstagram(
  files: File[]
): Promise<{ needsResize: File[]; analysis: Map<string, AspectRatioAnalysis> }> {
  const needsResize: File[] = [];
  const analysis = new Map<string, AspectRatioAnalysis>();
  
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      continue;
    }
    
    try {
      const { width, height } = await getImageDimensions(file);
      const result = analyzeInstagramAspectRatio(width, height);
      analysis.set(file.name, result);
      
      if (result.needsResize) {
        needsResize.push(file);
      }
    } catch (error) {
      console.error(`[instagramResize] Error analyzing file ${file.name}:`, error);
    }
  }
  
  return { needsResize, analysis };
}
