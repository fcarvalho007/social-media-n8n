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
 * Uses exact division without border trimming for precise cuts
 */
export function calculateManualCellBounds(
  rows: number,
  cols: number,
  imgWidth: number,
  imgHeight: number,
  removeBorders: boolean
): CellBounds[] {
  const cellWidth = Math.floor(imgWidth / cols);
  const cellHeight = Math.floor(imgHeight / rows);
  
  // Minimal border trim (0.5%) only when explicitly requested
  const borderTrim = removeBorders ? 0.005 : 0;
  const trimX = Math.floor(cellWidth * borderTrim);
  const trimY = Math.floor(cellHeight * borderTrim);

  const cells: CellBounds[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellWidth + trimX;
      const y = row * cellHeight + trimY;
      const width = cellWidth - (trimX * 2);
      const height = cellHeight - (trimY * 2);

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
 * Extract all cells from the canvas
 */
export async function extractAllCells(
  sourceCanvas: HTMLCanvasElement,
  cells: CellBounds[],
  onProgress?: (percent: number) => void
): Promise<DetectedImage[]> {
  const detectedImages: DetectedImage[] = [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    
    try {
      const { blob, dataUrl } = await extractCell(sourceCanvas, cell);
      
      detectedImages.push({
        id: cell.id,
        blob,
        dataUrl,
        order: i,
        selected: true
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
