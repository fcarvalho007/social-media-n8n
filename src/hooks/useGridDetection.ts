import { useState, useCallback } from 'react';
import { DetectedImage, GridConfig, GridDetectionProgress } from '@/types/grid-splitter';
import { loadImageToCanvas } from '@/lib/canvas/imageProcessing';
import { 
  calculateManualCellBounds, 
  extractAllCells 
} from '@/lib/canvas/cellExtraction';
import { cropToAspectRatio } from '@/lib/canvas/aspectRatioCrop';

interface UseGridDetectionReturn {
  processGrid: (
    image: File,
    config: GridConfig,
    removeBorders: boolean,
    forceAspectRatio?: number | null, // Aspect ratio applied to whole image first
    cellAspectRatio?: number | null   // Aspect ratio applied to each cell individually
  ) => Promise<DetectedImage[]>;
  isProcessing: boolean;
  progress: GridDetectionProgress | null;
  error: string | null;
}

export function useGridDetection(): UseGridDetectionReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<GridDetectionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processGrid = useCallback(async (
    image: File,
    config: GridConfig,
    removeBorders: boolean,
    forceAspectRatio?: number | null,
    cellAspectRatio?: number | null
  ): Promise<DetectedImage[]> => {
    setIsProcessing(true);
    setError(null);
    setProgress({ stage: 'loading', percent: 10, message: 'A carregar imagem...' });

    try {
      // Step 1: Load image to canvas
      const { canvas: sourceCanvas, width: origWidth, height: origHeight } = await loadImageToCanvas(image);
      
      let canvas = sourceCanvas;
      let width = origWidth;
      let height = origHeight;

      // Step 1.5: Force aspect ratio if specified (e.g., 3:4 for Instagram)
      if (forceAspectRatio) {
        setProgress({ stage: 'analyzing', percent: 25, message: 'A ajustar proporção...' });
        
        const { canvas: croppedCanvas, cropInfo } = cropToAspectRatio(sourceCanvas, forceAspectRatio);
        canvas = croppedCanvas;
        width = cropInfo.croppedWidth;
        height = cropInfo.croppedHeight;
        
        console.log(`[GridDetection] Cropped from ${origWidth}×${origHeight} to ${width}×${height} (ratio: ${forceAspectRatio})`);
      }
      
      setProgress({ stage: 'analyzing', percent: 40, message: `A dividir em ${config.rows}×${config.cols} células...` });

      // Step 2: Calculate cell bounds with PRECISE algorithm
      const cells = calculateManualCellBounds(config.rows, config.cols, width, height, removeBorders);
      
      // Log cell dimensions for debugging
      if (cells.length > 0) {
        console.log(`[GridDetection] First cell: ${cells[0].width}×${cells[0].height}px`);
        console.log(`[GridDetection] Last cell: ${cells[cells.length - 1].width}×${cells[cells.length - 1].height}px`);
        
        // Verify total coverage
        const totalWidth = cells.filter(c => c.row === 0).reduce((sum, c) => sum + c.width, 0);
        const totalHeight = cells.filter(c => c.col === 0).reduce((sum, c) => sum + c.height, 0);
        console.log(`[GridDetection] Total coverage: ${totalWidth}×${totalHeight}px (source: ${width}×${height}px)`);
      }

      // Step 3: Extract cells (with optional per-cell aspect ratio adjustment)
      setProgress({ stage: 'extracting', percent: 60, message: 'A extrair imagens...' });
      
      const detectedImages = await extractAllCells(canvas, cells, cellAspectRatio, (percent) => {
        setProgress({ 
          stage: 'extracting', 
          percent: 60 + (percent * 35), 
          message: `A extrair imagens... ${Math.round(percent * 100)}%` 
        });
      });
      
      // Log final dimensions
      if (detectedImages.length > 0 && cellAspectRatio) {
        console.log(`[GridDetection] Applied cell aspect ratio: ${cellAspectRatio}`);
        console.log(`[GridDetection] First cell output: ${detectedImages[0].width}×${detectedImages[0].height}px`);
      }

      setProgress({ stage: 'complete', percent: 100, message: 'Concluído!' });

      return detectedImages;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar grelha';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  }, []);

  return { processGrid, isProcessing, progress, error };
}
