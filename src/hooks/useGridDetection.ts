import { useState, useCallback } from 'react';
import { DetectedImage, GridConfig, GridDetectionProgress } from '@/types/grid-splitter';
import { loadImageToCanvas } from '@/lib/canvas/imageProcessing';
import { 
  calculateManualCellBounds, 
  extractAllCells,
  calculateCellBoundsWithGapDetection,
  CellBounds,
  GridGaps
} from '@/lib/canvas/cellExtraction';
import { cropToAspectRatio } from '@/lib/canvas/aspectRatioCrop';

interface MarginDetectionInfo {
  detected: boolean;
  avgMargin: number;
  color?: string;
  gapsFound?: { vertical: number; horizontal: number };
}

interface UseGridDetectionReturn {
  processGrid: (
    image: File,
    config: GridConfig,
    removeBorders: boolean,
    forceAspectRatio?: number | null,
    cellAspectRatio?: number | null
  ) => Promise<DetectedImage[]>;
  isProcessing: boolean;
  progress: GridDetectionProgress | null;
  error: string | null;
  marginInfo: MarginDetectionInfo | null;
}

export function useGridDetection(): UseGridDetectionReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<GridDetectionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marginInfo, setMarginInfo] = useState<MarginDetectionInfo | null>(null);

  const processGrid = useCallback(async (
    image: File,
    config: GridConfig,
    removeBorders: boolean,
    forceAspectRatio?: number | null,
    cellAspectRatio?: number | null
  ): Promise<DetectedImage[]> => {
    setIsProcessing(true);
    setError(null);
    setMarginInfo(null);
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
      
      let cells: CellBounds[];

      // Step 2: Calculate cell bounds
      if (removeBorders) {
        setProgress({ stage: 'analyzing', percent: 40, message: 'A detectar margens e gaps...' });
        
        // Use the new robust gap detection
        const result = calculateCellBoundsWithGapDetection(canvas, config.rows, config.cols, 35);
        cells = result.cells;
        
        if (result.gaps && result.exteriorMargins) {
          // Calculate average margin/gap size
          const allGaps = [...result.gaps.horizontal, ...result.gaps.vertical];
          const avgGapSize = allGaps.length > 0
            ? allGaps.reduce((sum, g) => sum + (g.end - g.start + 1), 0) / allGaps.length
            : 0;
          
          const marginColor = result.gaps.marginColor;
          
          setMarginInfo({
            detected: true,
            avgMargin: Math.round(avgGapSize + (result.exteriorMargins.top + result.exteriorMargins.bottom + result.exteriorMargins.left + result.exteriorMargins.right) / 4),
            color: marginColor ? `rgb(${marginColor.r}, ${marginColor.g}, ${marginColor.b})` : undefined,
            gapsFound: {
              vertical: result.gaps.vertical.length,
              horizontal: result.gaps.horizontal.length,
            },
          });
          
          console.log(`[GridDetection] Gap detection successful: ${result.gaps.vertical.length} vertical, ${result.gaps.horizontal.length} horizontal gaps`);
        } else {
          setMarginInfo({ detected: false, avgMargin: 0 });
          console.log('[GridDetection] Gap detection failed, using standard division');
        }
      } else {
        setProgress({ stage: 'analyzing', percent: 40, message: `A dividir em ${config.rows}×${config.cols} células...` });
        cells = calculateManualCellBounds(config.rows, config.cols, width, height, false);
      }
      
      // Log cell dimensions for debugging
      if (cells.length > 0) {
        console.log(`[GridDetection] First cell: ${cells[0].width}×${cells[0].height}px at (${cells[0].x}, ${cells[0].y})`);
        console.log(`[GridDetection] Last cell: ${cells[cells.length - 1].width}×${cells[cells.length - 1].height}px`);
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

  return { processGrid, isProcessing, progress, error, marginInfo };
}
