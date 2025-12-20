import { useState, useCallback } from 'react';
import { DetectedImage, GridConfig, GridDetectionProgress } from '@/types/grid-splitter';
import { loadImageToCanvas } from '@/lib/canvas/imageProcessing';
import { 
  calculateManualCellBounds, 
  extractAllCells 
} from '@/lib/canvas/cellExtraction';

interface UseGridDetectionReturn {
  processGrid: (
    image: File,
    config: GridConfig,
    removeBorders: boolean
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
    removeBorders: boolean
  ): Promise<DetectedImage[]> => {
    setIsProcessing(true);
    setError(null);
    setProgress({ stage: 'loading', percent: 10, message: 'A carregar imagem...' });

    try {
      // Step 1: Load image to canvas
      const { canvas, width, height } = await loadImageToCanvas(image);
      
      setProgress({ stage: 'analyzing', percent: 40, message: `A dividir em ${config.rows}×${config.cols} células...` });

      // Step 2: Calculate cell bounds
      const cells = calculateManualCellBounds(config.rows, config.cols, width, height, removeBorders);

      // Step 3: Extract cells
      setProgress({ stage: 'extracting', percent: 60, message: 'A extrair imagens...' });
      
      const detectedImages = await extractAllCells(canvas, cells, (percent) => {
        setProgress({ 
          stage: 'extracting', 
          percent: 60 + (percent * 35), 
          message: `A extrair imagens... ${Math.round(percent * 100)}%` 
        });
      });

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
