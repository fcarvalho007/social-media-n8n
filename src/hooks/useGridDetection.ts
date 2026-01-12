import { useState, useCallback } from 'react';
import { DetectedImage, GridConfig, GridDetectionProgress } from '@/types/grid-splitter';
import { loadImageToCanvas } from '@/lib/canvas/imageProcessing';
import { 
  calculateManualCellBounds, 
  extractAllCells,
  detectCellMargins,
  trimCellBounds,
  CellBounds
} from '@/lib/canvas/cellExtraction';
import { cropToAspectRatio } from '@/lib/canvas/aspectRatioCrop';

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
  marginInfo: { detected: boolean; avgMargin: number } | null;
}

export function useGridDetection(): UseGridDetectionReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<GridDetectionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marginInfo, setMarginInfo] = useState<{ detected: boolean; avgMargin: number } | null>(null);

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
      
      setProgress({ stage: 'analyzing', percent: 40, message: `A dividir em ${config.rows}×${config.cols} células...` });

      // Step 2: Calculate initial cell bounds
      let cells = calculateManualCellBounds(config.rows, config.cols, width, height, false);
      
      // Step 2.5: Apply intelligent margin detection if removeBorders is enabled
      if (removeBorders && cells.length > 0) {
        setProgress({ stage: 'analyzing', percent: 50, message: 'A detectar margens...' });
        
        const trimmedCells: CellBounds[] = [];
        let totalMarginDetected = 0;
        let marginsFound = 0;
        
        for (const cell of cells) {
          const margins = detectCellMargins(canvas, cell, 35);
          
          if (margins.detected) {
            const avgMargin = (margins.top + margins.right + margins.bottom + margins.left) / 4;
            totalMarginDetected += avgMargin;
            marginsFound++;
            
            const trimmedCell = trimCellBounds(cell, margins);
            
            // Validate trimmed cell has reasonable dimensions
            if (trimmedCell.width > 50 && trimmedCell.height > 50) {
              trimmedCells.push(trimmedCell);
              console.log(`[GridDetection] Cell ${cell.row}×${cell.col}: trimmed margins T:${margins.top} R:${margins.right} B:${margins.bottom} L:${margins.left}px`);
            } else {
              // Fallback to original if trimming was too aggressive
              trimmedCells.push(cell);
              console.log(`[GridDetection] Cell ${cell.row}×${cell.col}: margin trim skipped (would be too small)`);
            }
          } else {
            trimmedCells.push(cell);
          }
        }
        
        cells = trimmedCells;
        
        // Report margin detection results
        if (marginsFound > 0) {
          const avgMargin = Math.round(totalMarginDetected / marginsFound);
          setMarginInfo({ detected: true, avgMargin });
          console.log(`[GridDetection] Margins detected in ${marginsFound}/${cells.length} cells, avg: ${avgMargin}px`);
        } else {
          setMarginInfo({ detected: false, avgMargin: 0 });
          console.log(`[GridDetection] No margins detected - using standard cell bounds`);
        }
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
