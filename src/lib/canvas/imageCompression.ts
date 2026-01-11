/**
 * Adaptive Image Compression for Instagram API
 * 
 * Detects and compresses images to stay under 4MB limit
 * while maintaining best possible quality.
 */

const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Quality levels to try (from best to most compressed)
const QUALITY_LEVELS = [0.92, 0.85, 0.75, 0.65, 0.55, 0.45];

// Maximum dimension if compression alone isn't enough
const MAX_DIMENSION = 2048;

export interface OversizedImage {
  file: File;
  index: number;
  sizeMB: number;
  name: string;
  previewUrl?: string;
}

export interface CompressionResult {
  file: File;
  wasCompressed: boolean;
  originalSizeMB: number;
  finalSizeMB: number;
  qualityUsed: number;
  wasResized: boolean;
}

/**
 * Detect images that exceed the size limit (4MB by default)
 * Only checks image files, not videos
 * Includes preview URLs for visual identification
 */
export function detectOversizedImages(files: File[], maxSizeMB = MAX_FILE_SIZE_MB): OversizedImage[] {
  return files
    .map((file, index) => ({
      file,
      index,
      sizeMB: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
      name: file.name,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }))
    .filter(item => 
      item.file.type.startsWith('image/') && 
      item.sizeMB > maxSizeMB
    );
}

/**
 * Check if any files need compression
 */
export function hasOversizedImages(files: File[], maxSizeMB = MAX_FILE_SIZE_MB): boolean {
  return files.some(file => 
    file.type.startsWith('image/') && 
    file.size > maxSizeMB * 1024 * 1024
  );
}

/**
 * Compress a single image file to fit under the size limit
 * Uses progressive quality reduction, and resizes if needed
 */
export async function compressImageToLimit(
  file: File,
  maxSizeMB: number = MAX_FILE_SIZE_MB
): Promise<CompressionResult> {
  const originalSizeMB = file.size / (1024 * 1024);
  const maxBytes = maxSizeMB * 1024 * 1024;
  
  // Skip non-images or already small files
  if (!file.type.startsWith('image/') || file.size <= maxBytes) {
    return {
      file,
      wasCompressed: false,
      originalSizeMB,
      finalSizeMB: originalSizeMB,
      qualityUsed: 1,
      wasResized: false,
    };
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = async () => {
      URL.revokeObjectURL(url);
      
      try {
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        let wasResized = false;
        
        // First, try just reducing quality
        for (const quality of QUALITY_LEVELS) {
          const result = await compressToBlob(img, width, height, quality);
          
          if (result.size <= maxBytes) {
            const finalFile = new File(
              [result],
              file.name.replace(/\.[^.]+$/, '-opt.jpg'),
              { type: 'image/jpeg' }
            );
            
            resolve({
              file: finalFile,
              wasCompressed: true,
              originalSizeMB,
              finalSizeMB: result.size / (1024 * 1024),
              qualityUsed: quality,
              wasResized,
            });
            return;
          }
        }
        
        // If quality reduction alone isn't enough, also reduce dimensions
        const maxDim = MAX_DIMENSION;
        if (width > maxDim || height > maxDim) {
          const scale = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
          wasResized = true;
        }
        
        // Try again with reduced dimensions
        for (const quality of QUALITY_LEVELS) {
          const result = await compressToBlob(img, width, height, quality);
          
          if (result.size <= maxBytes) {
            const finalFile = new File(
              [result],
              file.name.replace(/\.[^.]+$/, '-opt.jpg'),
              { type: 'image/jpeg' }
            );
            
            resolve({
              file: finalFile,
              wasCompressed: true,
              originalSizeMB,
              finalSizeMB: result.size / (1024 * 1024),
              qualityUsed: quality,
              wasResized,
            });
            return;
          }
        }
        
        // Fallback: aggressive resize + lowest quality
        const aggressiveScale = 0.5;
        width = Math.round(width * aggressiveScale);
        height = Math.round(height * aggressiveScale);
        
        const result = await compressToBlob(img, width, height, 0.4);
        const finalFile = new File(
          [result],
          file.name.replace(/\.[^.]+$/, '-opt.jpg'),
          { type: 'image/jpeg' }
        );
        
        resolve({
          file: finalFile,
          wasCompressed: true,
          originalSizeMB,
          finalSizeMB: result.size / (1024 * 1024),
          qualityUsed: 0.4,
          wasResized: true,
        });
        
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
 * Helper: compress image to blob with specific dimensions and quality
 */
function compressToBlob(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas não suportado'));
      return;
    }
    
    // High quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(img, 0, 0, width, height);
    
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Falha ao criar blob'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Compress multiple files that exceed the size limit
 */
export async function compressOversizedFiles(
  files: File[],
  oversizedIndices: number[],
  maxSizeMB: number = MAX_FILE_SIZE_MB,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<{ files: File[]; results: CompressionResult[] }> {
  const resultFiles = [...files];
  const results: CompressionResult[] = [];
  
  for (let i = 0; i < oversizedIndices.length; i++) {
    const index = oversizedIndices[i];
    const file = files[index];
    
    onProgress?.(i + 1, oversizedIndices.length, file.name);
    
    const compressed = await compressImageToLimit(file, maxSizeMB);
    resultFiles[index] = compressed.file;
    results.push(compressed);
    
    console.log(
      `[imageCompression] Compressed ${file.name}: ` +
      `${compressed.originalSizeMB.toFixed(2)}MB → ${compressed.finalSizeMB.toFixed(2)}MB ` +
      `(quality: ${compressed.qualityUsed}, resized: ${compressed.wasResized})`
    );
  }
  
  return { files: resultFiles, results };
}
