/**
 * Cell extraction utilities for grid splitting
 * Includes intelligent margin detection for collages
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

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface MarginInfo {
  top: number;
  right: number;
  bottom: number;
  left: number;
  color: RGB;
  detected: boolean;
}

/**
 * Detect the dominant margin color by sampling edges of the canvas
 */
function detectMarginColor(
  canvas: HTMLCanvasElement,
  cell: CellBounds
): RGB {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { r: 255, g: 255, b: 255 };

  const samplePoints: { x: number; y: number }[] = [];
  
  // Sample corners and edges of the cell
  const margin = 3; // pixels from edge to sample
  
  // Top edge samples
  for (let i = 0; i < 5; i++) {
    const x = Math.min(cell.x + margin + (cell.width - margin * 2) * (i / 4), canvas.width - 1);
    samplePoints.push({ x: Math.floor(x), y: Math.floor(cell.y + margin) });
  }
  
  // Bottom edge samples
  for (let i = 0; i < 5; i++) {
    const x = Math.min(cell.x + margin + (cell.width - margin * 2) * (i / 4), canvas.width - 1);
    samplePoints.push({ x: Math.floor(x), y: Math.floor(Math.min(cell.y + cell.height - margin, canvas.height - 1)) });
  }
  
  // Left edge samples
  for (let i = 0; i < 3; i++) {
    const y = Math.min(cell.y + cell.height * ((i + 1) / 4), canvas.height - 1);
    samplePoints.push({ x: Math.floor(cell.x + margin), y: Math.floor(y) });
  }
  
  // Right edge samples
  for (let i = 0; i < 3; i++) {
    const y = Math.min(cell.y + cell.height * ((i + 1) / 4), canvas.height - 1);
    samplePoints.push({ x: Math.floor(Math.min(cell.x + cell.width - margin, canvas.width - 1)), y: Math.floor(y) });
  }

  let r = 0, g = 0, b = 0;
  let validSamples = 0;

  for (const point of samplePoints) {
    if (point.x >= 0 && point.x < canvas.width && point.y >= 0 && point.y < canvas.height) {
      const pixel = ctx.getImageData(point.x, point.y, 1, 1).data;
      r += pixel[0];
      g += pixel[1];
      b += pixel[2];
      validSamples++;
    }
  }

  if (validSamples === 0) return { r: 255, g: 255, b: 255 };

  return {
    r: Math.round(r / validSamples),
    g: Math.round(g / validSamples),
    b: Math.round(b / validSamples),
  };
}

/**
 * Check if two colors match within a tolerance
 */
function colorsMatch(c1: RGB, c2: RGB, tolerance: number): boolean {
  const diff = Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
  return diff <= tolerance * 3;
}

/**
 * Check if a line (row or column) is entirely margin color
 */
function isLineMargin(
  ctx: CanvasRenderingContext2D,
  cell: CellBounds,
  edge: 'left' | 'right' | 'top' | 'bottom',
  offset: number,
  marginColor: RGB,
  tolerance: number,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  const sampleCount = 8; // Number of points to sample along the line
  let matchCount = 0;

  for (let i = 0; i < sampleCount; i++) {
    let x: number, y: number;
    const progress = (i + 0.5) / sampleCount;

    switch (edge) {
      case 'left':
        x = Math.floor(cell.x + offset);
        y = Math.floor(cell.y + cell.height * progress);
        break;
      case 'right':
        x = Math.floor(cell.x + cell.width - 1 - offset);
        y = Math.floor(cell.y + cell.height * progress);
        break;
      case 'top':
        x = Math.floor(cell.x + cell.width * progress);
        y = Math.floor(cell.y + offset);
        break;
      case 'bottom':
        x = Math.floor(cell.x + cell.width * progress);
        y = Math.floor(cell.y + cell.height - 1 - offset);
        break;
    }

    // Clamp to canvas bounds
    x = Math.max(0, Math.min(x, canvasWidth - 1));
    y = Math.max(0, Math.min(y, canvasHeight - 1));

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const pixelColor: RGB = { r: pixel[0], g: pixel[1], b: pixel[2] };

    if (colorsMatch(pixelColor, marginColor, tolerance)) {
      matchCount++;
    }
  }

  // Consider it a margin line if 75%+ of samples match
  return matchCount >= sampleCount * 0.75;
}

/**
 * Scan from an edge inward to find where the margin ends
 */
function scanFromEdge(
  canvas: HTMLCanvasElement,
  cell: CellBounds,
  edge: 'left' | 'right' | 'top' | 'bottom',
  marginColor: RGB,
  tolerance: number
): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  // Maximum scan distance: 30% of cell dimension or 100px, whichever is smaller
  const maxScan = edge === 'left' || edge === 'right'
    ? Math.min(Math.floor(cell.width * 0.3), 100)
    : Math.min(Math.floor(cell.height * 0.3), 100);

  // Minimum content size to preserve (at least 40% of original)
  const minPreserve = edge === 'left' || edge === 'right'
    ? Math.floor(cell.width * 0.4)
    : Math.floor(cell.height * 0.4);

  let marginEnd = 0;

  for (let offset = 0; offset < maxScan; offset++) {
    if (isLineMargin(ctx, cell, edge, offset, marginColor, tolerance, canvas.width, canvas.height)) {
      marginEnd = offset + 1;
    } else {
      // Found content - stop scanning
      break;
    }
  }

  // Ensure we don't trim too much (preserve at least 40% of content)
  const dimension = edge === 'left' || edge === 'right' ? cell.width : cell.height;
  if (marginEnd > dimension - minPreserve) {
    marginEnd = 0; // Safety: don't trim if it would remove too much
  }

  return marginEnd;
}

/**
 * Detect and calculate margin trims for a cell
 */
export function detectCellMargins(
  canvas: HTMLCanvasElement,
  cell: CellBounds,
  tolerance: number = 30
): MarginInfo {
  const marginColor = detectMarginColor(canvas, cell);
  
  // Check if the detected color is likely a margin (white, near-white, or grey)
  const isLikelyMargin = (
    marginColor.r > 200 && marginColor.g > 200 && marginColor.b > 200
  ) || (
    // Also detect grey margins
    Math.abs(marginColor.r - marginColor.g) < 20 &&
    Math.abs(marginColor.g - marginColor.b) < 20 &&
    marginColor.r > 100
  );

  if (!isLikelyMargin) {
    return { top: 0, right: 0, bottom: 0, left: 0, color: marginColor, detected: false };
  }

  const top = scanFromEdge(canvas, cell, 'top', marginColor, tolerance);
  const right = scanFromEdge(canvas, cell, 'right', marginColor, tolerance);
  const bottom = scanFromEdge(canvas, cell, 'bottom', marginColor, tolerance);
  const left = scanFromEdge(canvas, cell, 'left', marginColor, tolerance);

  // Only consider margins detected if we found at least some on multiple sides
  const sidesWithMargin = [top, right, bottom, left].filter(m => m > 3).length;
  const detected = sidesWithMargin >= 2;

  return { top, right, bottom, left, color: marginColor, detected };
}

/**
 * Apply margin trimming to a cell's bounds
 */
export function trimCellBounds(cell: CellBounds, margins: MarginInfo): CellBounds {
  return {
    ...cell,
    x: cell.x + margins.left,
    y: cell.y + margins.top,
    width: cell.width - margins.left - margins.right,
    height: cell.height - margins.top - margins.bottom,
  };
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
