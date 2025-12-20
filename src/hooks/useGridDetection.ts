import { useState, useCallback } from 'react';
import { DetectedImage, GridConfig } from '@/types/grid-splitter';

interface UseGridDetectionReturn {
  processGrid: (
    image: File,
    mode: 'auto' | 'manual',
    config: GridConfig,
    sensitivity: number,
    removeBorders: boolean
  ) => Promise<DetectedImage[]>;
  isProcessing: boolean;
  error: string | null;
}

export function useGridDetection(): UseGridDetectionReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processGrid = useCallback(async (
    image: File,
    mode: 'auto' | 'manual',
    config: GridConfig,
    sensitivity: number,
    removeBorders: boolean
  ): Promise<DetectedImage[]> => {
    setIsProcessing(true);
    setError(null);

    try {
      // Phase 1: Manual split only - divides image into grid based on rows/cols
      const detectedImages = await splitImageByGrid(image, config.rows, config.cols, removeBorders);
      
      if (detectedImages.length === 0) {
        throw new Error('Não foram detectadas imagens na grelha');
      }

      return detectedImages;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar grelha';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { processGrid, isProcessing, error };
}

/**
 * Splits an image into a grid of rows x cols cells
 * Phase 1: Simple manual split using canvas
 */
async function splitImageByGrid(
  imageFile: File,
  rows: number,
  cols: number,
  removeBorders: boolean
): Promise<DetectedImage[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      try {
        const cellWidth = Math.floor(img.width / cols);
        const cellHeight = Math.floor(img.height / rows);
        
        // Optional border removal - trim 2% from edges of each cell
        const borderTrim = removeBorders ? 0.02 : 0;
        const trimX = Math.floor(cellWidth * borderTrim);
        const trimY = Math.floor(cellHeight * borderTrim);
        
        const detectedImages: DetectedImage[] = [];
        let order = 0;

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              throw new Error('Não foi possível criar canvas');
            }

            // Calculate source position and dimensions with border trimming
            const srcX = col * cellWidth + trimX;
            const srcY = row * cellHeight + trimY;
            const srcWidth = cellWidth - (trimX * 2);
            const srcHeight = cellHeight - (trimY * 2);

            canvas.width = srcWidth;
            canvas.height = srcHeight;

            ctx.drawImage(
              img,
              srcX, srcY, srcWidth, srcHeight,
              0, 0, srcWidth, srcHeight
            );

            // Convert canvas to blob
            canvas.toBlob((blob) => {
              if (blob) {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                detectedImages.push({
                  id: `grid-${row}-${col}-${Date.now()}`,
                  blob,
                  dataUrl,
                  order: order++,
                  selected: true,
                });

                // Check if all cells are processed
                if (detectedImages.length === rows * cols) {
                  // Sort by order to ensure correct sequence
                  detectedImages.sort((a, b) => a.order - b.order);
                  URL.revokeObjectURL(url);
                  resolve(detectedImages);
                }
              }
            }, 'image/jpeg', 0.92);
          }
        }
      } catch (err) {
        URL.revokeObjectURL(url);
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
