import { useState, useCallback } from 'react';
import { DetectedImage, GridConfig, GridDetectionProgress, GridDetectionResult } from '@/types/grid-splitter';
import { loadImageToCanvas, toGrayscale, applyBoxBlur } from '@/lib/canvas/imageProcessing';
import { 
  detectHorizontalSeparators, 
  detectVerticalSeparators, 
  validateGridStructure,
  findSeparatorColor
} from '@/lib/canvas/gridAnalysis';
import { 
  calculateCellBounds, 
  calculateManualCellBounds, 
  extractAllCells 
} from '@/lib/canvas/cellExtraction';

interface UseGridDetectionReturn {
  processGrid: (
    image: File,
    mode: 'auto' | 'manual',
    config: GridConfig,
    sensitivity: number,
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
    mode: 'auto' | 'manual',
    config: GridConfig,
    sensitivity: number,
    removeBorders: boolean
  ): Promise<DetectedImage[]> => {
    setIsProcessing(true);
    setError(null);
    setProgress({ stage: 'loading', percent: 5, message: 'A carregar imagem...' });

    try {
      // Step 1: Load image to canvas
      const { canvas, imageData, width, height } = await loadImageToCanvas(image);
      
      setProgress({ stage: 'preprocessing', percent: 15, message: 'A pré-processar...' });

      if (mode === 'auto') {
        // Automatic detection mode
        return await autoDetect(canvas, imageData, width, height, sensitivity, removeBorders, setProgress);
      } else {
        // Manual mode - simple grid split
        return await manualSplit(canvas, config, width, height, removeBorders, setProgress);
      }
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

/**
 * Automatic grid detection using variance analysis
 */
async function autoDetect(
  canvas: HTMLCanvasElement,
  imageData: ImageData,
  width: number,
  height: number,
  sensitivity: number,
  removeBorders: boolean,
  setProgress: (p: GridDetectionProgress) => void
): Promise<DetectedImage[]> {
  // Step 2: Convert to grayscale
  setProgress({ stage: 'preprocessing', percent: 25, message: 'A converter para análise...' });
  const grayData = toGrayscale(imageData);

  // Step 3: Apply blur based on sensitivity (lower sensitivity = more blur to reduce noise)
  const blurRadius = sensitivity < 30 ? 2 : sensitivity < 60 ? 1 : 0;
  const processedData = blurRadius > 0 ? applyBoxBlur(grayData, blurRadius) : grayData;

  // Step 4: Detect separators
  setProgress({ stage: 'analyzing', percent: 40, message: 'A detetar separadores horizontais...' });
  const minCellSize = Math.min(width, height) * 0.05; // Min 5% of smallest dimension
  const hSeparators = detectHorizontalSeparators(processedData, sensitivity, minCellSize);

  setProgress({ stage: 'analyzing', percent: 55, message: 'A detetar separadores verticais...' });
  const vSeparators = detectVerticalSeparators(processedData, sensitivity, minCellSize);

  // Step 5: Validate grid structure
  setProgress({ stage: 'analyzing', percent: 65, message: 'A validar estrutura da grelha...' });
  const validation = validateGridStructure(hSeparators, vSeparators, width, height);

  // Check confidence
  if (!validation.isValid) {
    throw new Error(validation.message || 'Não foi possível detetar uma grelha. Experimente o modo manual.');
  }

  // Step 6: Calculate cell bounds
  setProgress({ stage: 'extracting', percent: 75, message: `A extrair ${validation.rows * validation.cols} imagens...` });
  const cells = calculateCellBounds(hSeparators, vSeparators, width, height, removeBorders);

  if (cells.length === 0) {
    throw new Error('Não foram detectadas células na grelha');
  }

  // Step 7: Extract cells
  const detectedImages = await extractAllCells(canvas, cells, (percent) => {
    setProgress({ 
      stage: 'extracting', 
      percent: 75 + (percent * 20), 
      message: `A extrair imagens... ${Math.round(percent * 100)}%` 
    });
  });

  // Optional: Get separator color for info
  const separatorColor = findSeparatorColor(imageData, hSeparators, vSeparators, width, height);

  setProgress({ stage: 'complete', percent: 100, message: 'Concluído!' });

  // Log detection info for debugging
  console.log('Grid Detection Result:', {
    rows: validation.rows,
    cols: validation.cols,
    confidence: validation.confidence,
    separatorColor,
    cellCount: detectedImages.length
  });

  return detectedImages;
}

/**
 * Manual grid split based on rows/cols configuration
 */
async function manualSplit(
  canvas: HTMLCanvasElement,
  config: GridConfig,
  width: number,
  height: number,
  removeBorders: boolean,
  setProgress: (p: GridDetectionProgress) => void
): Promise<DetectedImage[]> {
  setProgress({ stage: 'analyzing', percent: 50, message: `A dividir em ${config.rows}×${config.cols} células...` });

  // Calculate cell bounds
  const cells = calculateManualCellBounds(config.rows, config.cols, width, height, removeBorders);

  // Extract cells
  setProgress({ stage: 'extracting', percent: 70, message: 'A extrair imagens...' });
  
  const detectedImages = await extractAllCells(canvas, cells, (percent) => {
    setProgress({ 
      stage: 'extracting', 
      percent: 70 + (percent * 25), 
      message: `A extrair imagens... ${Math.round(percent * 100)}%` 
    });
  });

  setProgress({ stage: 'complete', percent: 100, message: 'Concluído!' });

  return detectedImages;
}
