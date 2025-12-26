/**
 * Cell extraction utilities for grid splitting
 */

import { SeparatorLine } from './gridAnalysis';
import { DetectedImage } from '@/types/grid-splitter';

export interface CellBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  col: number;
}

/**
 * Calculate cell boundaries from detected separators
 */
export function calculateCellBounds(
  hSeparators: SeparatorLine[],
  vSeparators: SeparatorLine[],
  imgWidth: number,
  imgHeight: number,
  removeBorders: boolean
): CellBounds[] {
  // Create position arrays including image edges
  const hPositions = [
    0,
    ...hSeparators.map(s => removeBorders ? s.end + 1 : s.position),
    imgHeight
  ];
  
  const vPositions = [
    0,
    ...vSeparators.map(s => removeBorders ? s.end + 1 : s.position),
    imgWidth
  ];

  // Adjust end positions when removing borders
  const hEnds = [
    ...hSeparators.map(s => removeBorders ? s.start - 1 : s.position),
    imgHeight
  ];
  
  const vEnds = [
    ...vSeparators.map(s => removeBorders ? s.start - 1 : s.position),
    imgWidth
  ];

  const cells: CellBounds[] = [];

  for (let row = 0; row < hPositions.length - 1; row++) {
    for (let col = 0; col < vPositions.length - 1; col++) {
      const x = vPositions[col];
      const y = hPositions[row];
      const endX = vEnds[col];
      const endY = hEnds[row];
      
      const width = endX - x;
      const height = endY - y;

      // Skip cells that are too small
      if (width < 10 || height < 10) continue;

      cells.push({
        id: `cell-${row}-${col}-${Date.now()}`,
        x,
        y,
        width,
        height,
        row,
        col
      });
    }
  }

  return cells;
}

/**
 * Calculate cell boundaries for manual grid split
 * PRECISE VERSION: Last cell in each row/column absorbs residual pixels
 * This ensures NO pixels are lost during splitting
 */
export function calculateManualCellBounds(
  rows: number,
  cols: number,
  imgWidth: number,
  imgHeight: number,
  removeBorders: boolean
): CellBounds[] {
  // Base cell dimensions (floor division)
  const baseCellWidth = Math.floor(imgWidth / cols);
  const baseCellHeight = Math.floor(imgHeight / rows);
  
  // Residual pixels that need to be distributed to last cells
  const extraPixelsX = imgWidth - (baseCellWidth * cols);
  const extraPixelsY = imgHeight - (baseCellHeight * rows);
  
  // Minimal border trim only when explicitly requested
  const borderTrim = removeBorders ? 0.005 : 0;

  const cells: CellBounds[] = [];

  let currentY = 0;
  for (let row = 0; row < rows; row++) {
    // Last row absorbs extra Y pixels
    const isLastRow = row === rows - 1;
    const cellHeight = isLastRow 
      ? (imgHeight - currentY) // Use remaining height for last row
      : baseCellHeight;
    
    const trimY = removeBorders ? Math.floor(cellHeight * borderTrim) : 0;
    
    let currentX = 0;
    for (let col = 0; col < cols; col++) {
      // Last column absorbs extra X pixels
      const isLastCol = col === cols - 1;
      const cellWidth = isLastCol 
        ? (imgWidth - currentX) // Use remaining width for last column
        : baseCellWidth;
      
      const trimX = removeBorders ? Math.floor(cellWidth * borderTrim) : 0;

      cells.push({
        id: `cell-${row}-${col}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        x: currentX + trimX,
        y: currentY + trimY,
        width: cellWidth - (trimX * 2),
        height: cellHeight - (trimY * 2),
        row,
        col
      });
      
      currentX += baseCellWidth;
    }
    currentY += baseCellHeight;
  }

  return cells;
}

/**
 * Extract a single cell from the canvas
 */
export async function extractCell(
  sourceCanvas: HTMLCanvasElement,
  cell: CellBounds,
  quality: number = 0.92
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Não foi possível criar canvas'));
      return;
    }

    canvas.width = cell.width;
    canvas.height = cell.height;

    ctx.drawImage(
      sourceCanvas,
      cell.x, cell.y, cell.width, cell.height,
      0, 0, cell.width, cell.height
    );

    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({ blob, dataUrl });
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
 * Extract a cell with aspect ratio adjustment (central crop)
 * This extracts the cell and then crops it to achieve the target aspect ratio
 */
export async function extractCellWithAspectRatio(
  sourceCanvas: HTMLCanvasElement,
  cell: CellBounds,
  targetRatio: number,
  quality: number = 0.92
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Não foi possível criar canvas'));
      return;
    }

    // Calculate the current cell's aspect ratio
    const currentRatio = cell.width / cell.height;
    
    let srcX = cell.x;
    let srcY = cell.y;
    let srcWidth = cell.width;
    let srcHeight = cell.height;

    if (currentRatio > targetRatio) {
      // Cell is too wide - crop sides (reduce width)
      const newWidth = cell.height * targetRatio;
      const offsetX = (cell.width - newWidth) / 2;
      srcX = cell.x + offsetX;
      srcWidth = newWidth;
    } else if (currentRatio < targetRatio) {
      // Cell is too tall - crop top/bottom (reduce height)
      const newHeight = cell.width / targetRatio;
      const offsetY = (cell.height - newHeight) / 2;
      srcY = cell.y + offsetY;
      srcHeight = newHeight;
    }

    // Final output dimensions (use the cropped dimensions)
    const outputWidth = Math.round(srcWidth);
    const outputHeight = Math.round(srcHeight);
    
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    ctx.drawImage(
      sourceCanvas,
      srcX, srcY, srcWidth, srcHeight,
      0, 0, outputWidth, outputHeight
    );

    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({ blob, dataUrl, width: outputWidth, height: outputHeight });
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
 * Extract all cells from the canvas
 * Optionally applies aspect ratio adjustment to each cell
 */
export async function extractAllCells(
  sourceCanvas: HTMLCanvasElement,
  cells: CellBounds[],
  targetAspectRatio?: number | null,
  onProgress?: (percent: number) => void
): Promise<DetectedImage[]> {
  const detectedImages: DetectedImage[] = [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    
    try {
      let result: { blob: Blob; dataUrl: string; width?: number; height?: number };
      
      if (targetAspectRatio && targetAspectRatio > 0) {
        // Extract with aspect ratio adjustment
        result = await extractCellWithAspectRatio(sourceCanvas, cell, targetAspectRatio);
      } else {
        // Extract without adjustment
        const basic = await extractCell(sourceCanvas, cell);
        result = { ...basic, width: cell.width, height: cell.height };
      }
      
      detectedImages.push({
        id: cell.id,
        blob: result.blob,
        dataUrl: result.dataUrl,
        order: i,
        selected: true,
        width: result.width ?? cell.width,
        height: result.height ?? cell.height,
      });

      if (onProgress) {
        onProgress((i + 1) / cells.length);
      }
    } catch (error) {
      console.error(`Error extracting cell ${i}:`, error);
      // Continue with other cells even if one fails
    }
  }

  return detectedImages;
}
