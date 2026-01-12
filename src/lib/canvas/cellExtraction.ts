/**
 * Cell extraction utilities for grid splitting
 * Includes intelligent margin detection for collages
 * 
 * V2: Robust global margin detection with gap scanning
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

export interface MarginInfo {
  top: number;
  right: number;
  bottom: number;
  left: number;
  color: RGB;
  detected: boolean;
}

export interface GridGaps {
  horizontal: Array<{ position: number; start: number; end: number }>;
  vertical: Array<{ position: number; start: number; end: number }>;
  marginColor: RGB | null;
}

// ============= GLOBAL MARGIN DETECTION =============

/**
 * Detect the global margin color by sampling the EXTERIOR BORDERS of the entire image
 * This is more reliable than sampling within cells
 */
export function detectGlobalMarginColor(canvas: HTMLCanvasElement): RGB | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const w = canvas.width;
  const h = canvas.height;
  
  // Sample points along the exterior borders of the image
  const samplePoints: { x: number; y: number }[] = [
    // Corners (5px inward)
    { x: 5, y: 5 },
    { x: w - 6, y: 5 },
    { x: 5, y: h - 6 },
    { x: w - 6, y: h - 6 },
    // Top edge
    { x: Math.floor(w * 0.25), y: 3 },
    { x: Math.floor(w * 0.5), y: 3 },
    { x: Math.floor(w * 0.75), y: 3 },
    // Bottom edge
    { x: Math.floor(w * 0.25), y: h - 4 },
    { x: Math.floor(w * 0.5), y: h - 4 },
    { x: Math.floor(w * 0.75), y: h - 4 },
    // Left edge
    { x: 3, y: Math.floor(h * 0.25) },
    { x: 3, y: Math.floor(h * 0.5) },
    { x: 3, y: Math.floor(h * 0.75) },
    // Right edge
    { x: w - 4, y: Math.floor(h * 0.25) },
    { x: w - 4, y: Math.floor(h * 0.5) },
    { x: w - 4, y: Math.floor(h * 0.75) },
  ];

  const colors: RGB[] = [];
  
  for (const point of samplePoints) {
    const x = Math.max(0, Math.min(point.x, w - 1));
    const y = Math.max(0, Math.min(point.y, h - 1));
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    colors.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
  }

  // Calculate average and standard deviation
  const avgR = colors.reduce((s, c) => s + c.r, 0) / colors.length;
  const avgG = colors.reduce((s, c) => s + c.g, 0) / colors.length;
  const avgB = colors.reduce((s, c) => s + c.b, 0) / colors.length;

  // Calculate color consistency (standard deviation)
  const stdDev = Math.sqrt(
    colors.reduce((s, c) => {
      return s + Math.pow(c.r - avgR, 2) + Math.pow(c.g - avgG, 2) + Math.pow(c.b - avgB, 2);
    }, 0) / (colors.length * 3)
  );

  // If colors are consistent (low deviation), we have a uniform margin
  // Tolerance: stdDev < 30 means uniform enough
  if (stdDev > 35) {
    console.log(`[MarginDetection] No uniform margin found, stdDev: ${stdDev.toFixed(1)}`);
    return null;
  }

  const marginColor = {
    r: Math.round(avgR),
    g: Math.round(avgG),
    b: Math.round(avgB),
  };

  console.log(`[MarginDetection] Global margin detected: rgb(${marginColor.r}, ${marginColor.g}, ${marginColor.b}), stdDev: ${stdDev.toFixed(1)}`);
  
  return marginColor;
}

/**
 * Check if two colors match within a tolerance
 */
function colorsMatch(c1: RGB, c2: RGB, tolerance: number): boolean {
  const diff = Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
  return diff <= tolerance * 3;
}

/**
 * Check if a vertical line at position x is mostly margin color
 */
function isVerticalLineMargin(
  ctx: CanvasRenderingContext2D,
  x: number,
  yStart: number,
  yEnd: number,
  marginColor: RGB,
  tolerance: number
): boolean {
  const sampleCount = 12;
  let matchCount = 0;
  
  for (let i = 0; i < sampleCount; i++) {
    const y = Math.floor(yStart + (yEnd - yStart) * ((i + 0.5) / sampleCount));
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const pixelColor: RGB = { r: pixel[0], g: pixel[1], b: pixel[2] };
    
    if (colorsMatch(pixelColor, marginColor, tolerance)) {
      matchCount++;
    }
  }
  
  return matchCount >= sampleCount * 0.7; // 70% threshold
}

/**
 * Check if a horizontal line at position y is mostly margin color
 */
function isHorizontalLineMargin(
  ctx: CanvasRenderingContext2D,
  y: number,
  xStart: number,
  xEnd: number,
  marginColor: RGB,
  tolerance: number
): boolean {
  const sampleCount = 12;
  let matchCount = 0;
  
  for (let i = 0; i < sampleCount; i++) {
    const x = Math.floor(xStart + (xEnd - xStart) * ((i + 0.5) / sampleCount));
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const pixelColor: RGB = { r: pixel[0], g: pixel[1], b: pixel[2] };
    
    if (colorsMatch(pixelColor, marginColor, tolerance)) {
      matchCount++;
    }
  }
  
  return matchCount >= sampleCount * 0.7;
}

/**
 * Find the actual gap boundaries around an expected position
 * Scans ±10% around the expected position to find where the gap starts and ends
 */
function findGapBoundaries(
  ctx: CanvasRenderingContext2D,
  expectedPos: number,
  dimension: number,
  orthogonalStart: number,
  orthogonalEnd: number,
  marginColor: RGB,
  tolerance: number,
  isVertical: boolean
): { start: number; end: number } | null {
  const searchRadius = Math.floor(dimension * 0.12); // ±12% search window
  const minPos = Math.max(0, expectedPos - searchRadius);
  const maxPos = Math.min(dimension - 1, expectedPos + searchRadius);
  
  let gapStart = -1;
  let gapEnd = -1;
  
  // Scan from minPos to maxPos looking for margin color
  for (let pos = minPos; pos <= maxPos; pos++) {
    const isMargin = isVertical
      ? isVerticalLineMargin(ctx, pos, orthogonalStart, orthogonalEnd, marginColor, tolerance)
      : isHorizontalLineMargin(ctx, pos, orthogonalStart, orthogonalEnd, marginColor, tolerance);
    
    if (isMargin) {
      if (gapStart === -1) gapStart = pos;
      gapEnd = pos;
    } else if (gapStart !== -1) {
      // Found the end of a gap
      break;
    }
  }
  
  // Validate: gap must be at least 3px wide
  if (gapStart !== -1 && gapEnd !== -1 && (gapEnd - gapStart) >= 2) {
    return { start: gapStart, end: gapEnd };
  }
  
  return null;
}

/**
 * Find all grid gaps (horizontal and vertical separations)
 */
export function findGridGaps(
  canvas: HTMLCanvasElement,
  marginColor: RGB,
  rows: number,
  cols: number,
  tolerance: number = 35
): GridGaps {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { horizontal: [], vertical: [], marginColor };
  }

  const w = canvas.width;
  const h = canvas.height;
  
  const verticalGaps: Array<{ position: number; start: number; end: number }> = [];
  const horizontalGaps: Array<{ position: number; start: number; end: number }> = [];
  
  // Find vertical gaps (between columns)
  for (let c = 1; c < cols; c++) {
    const expectedX = Math.floor((w / cols) * c);
    const gap = findGapBoundaries(ctx, expectedX, w, 0, h, marginColor, tolerance, true);
    
    if (gap) {
      verticalGaps.push({ position: expectedX, ...gap });
      console.log(`[GridGaps] Vertical gap at col ${c}: x=${gap.start}-${gap.end} (${gap.end - gap.start + 1}px)`);
    }
  }
  
  // Find horizontal gaps (between rows)
  for (let r = 1; r < rows; r++) {
    const expectedY = Math.floor((h / rows) * r);
    const gap = findGapBoundaries(ctx, expectedY, h, 0, w, marginColor, tolerance, false);
    
    if (gap) {
      horizontalGaps.push({ position: expectedY, ...gap });
      console.log(`[GridGaps] Horizontal gap at row ${r}: y=${gap.start}-${gap.end} (${gap.end - gap.start + 1}px)`);
    }
  }
  
  return { horizontal: horizontalGaps, vertical: verticalGaps, marginColor };
}

/**
 * Find exterior margins (padding around the entire grid)
 */
function findExteriorMargins(
  canvas: HTMLCanvasElement,
  marginColor: RGB,
  tolerance: number
): { top: number; right: number; bottom: number; left: number } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { top: 0, right: 0, bottom: 0, left: 0 };

  const w = canvas.width;
  const h = canvas.height;
  const maxScan = Math.min(100, Math.floor(Math.min(w, h) * 0.15));
  
  let top = 0, right = 0, bottom = 0, left = 0;
  
  // Scan from top
  for (let y = 0; y < maxScan; y++) {
    if (isHorizontalLineMargin(ctx, y, 0, w, marginColor, tolerance)) {
      top = y + 1;
    } else break;
  }
  
  // Scan from bottom
  for (let y = h - 1; y > h - maxScan; y--) {
    if (isHorizontalLineMargin(ctx, y, 0, w, marginColor, tolerance)) {
      bottom = h - y;
    } else break;
  }
  
  // Scan from left
  for (let x = 0; x < maxScan; x++) {
    if (isVerticalLineMargin(ctx, x, 0, h, marginColor, tolerance)) {
      left = x + 1;
    } else break;
  }
  
  // Scan from right
  for (let x = w - 1; x > w - maxScan; x--) {
    if (isVerticalLineMargin(ctx, x, 0, h, marginColor, tolerance)) {
      right = w - x;
    } else break;
  }
  
  console.log(`[MarginDetection] Exterior margins: T=${top} R=${right} B=${bottom} L=${left}`);
  
  return { top, right, bottom, left };
}

/**
 * Calculate cell bounds using detected gaps (precise method)
 */
export function calculateCellBoundsFromGaps(
  imgWidth: number,
  imgHeight: number,
  rows: number,
  cols: number,
  gaps: GridGaps,
  exteriorMargins: { top: number; right: number; bottom: number; left: number }
): CellBounds[] {
  const cells: CellBounds[] = [];
  
  // Build X positions (left edges of cells)
  const xPositions: number[] = [exteriorMargins.left];
  for (const gap of gaps.vertical) {
    xPositions.push(gap.end + 1);
  }
  
  // Build X end positions (right edges of cells)
  const xEnds: number[] = [];
  for (const gap of gaps.vertical) {
    xEnds.push(gap.start);
  }
  xEnds.push(imgWidth - exteriorMargins.right);
  
  // Build Y positions (top edges of cells)
  const yPositions: number[] = [exteriorMargins.top];
  for (const gap of gaps.horizontal) {
    yPositions.push(gap.end + 1);
  }
  
  // Build Y end positions (bottom edges of cells)
  const yEnds: number[] = [];
  for (const gap of gaps.horizontal) {
    yEnds.push(gap.start);
  }
  yEnds.push(imgHeight - exteriorMargins.bottom);
  
  // Create cells
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = xPositions[col] ?? exteriorMargins.left;
      const y = yPositions[row] ?? exteriorMargins.top;
      const endX = xEnds[col] ?? (imgWidth - exteriorMargins.right);
      const endY = yEnds[row] ?? (imgHeight - exteriorMargins.bottom);
      
      const width = endX - x;
      const height = endY - y;
      
      if (width > 10 && height > 10) {
        cells.push({
          id: `cell-${row}-${col}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          x,
          y,
          width,
          height,
          row,
          col,
        });
      }
    }
  }
  
  return cells;
}

/**
 * Main function: Calculate cell bounds with intelligent gap detection
 */
export function calculateCellBoundsWithGapDetection(
  canvas: HTMLCanvasElement,
  rows: number,
  cols: number,
  tolerance: number = 35
): { cells: CellBounds[]; gaps: GridGaps | null; exteriorMargins: { top: number; right: number; bottom: number; left: number } | null } {
  // Step 1: Detect global margin color
  const marginColor = detectGlobalMarginColor(canvas);
  
  if (!marginColor) {
    console.log('[GridDetection] No margin color detected, using standard division');
    return { cells: calculateManualCellBounds(rows, cols, canvas.width, canvas.height, false), gaps: null, exteriorMargins: null };
  }
  
  // Step 2: Find exterior margins
  const exteriorMargins = findExteriorMargins(canvas, marginColor, tolerance);
  
  // Step 3: Find grid gaps
  const gaps = findGridGaps(canvas, marginColor, rows, cols, tolerance);
  
  // Step 4: Calculate cell bounds from gaps
  const cells = calculateCellBoundsFromGaps(
    canvas.width,
    canvas.height,
    rows,
    cols,
    gaps,
    exteriorMargins
  );
  
  // Validate: if we don't have all expected cells, fallback
  const expectedCellCount = rows * cols;
  if (cells.length !== expectedCellCount) {
    console.log(`[GridDetection] Gap detection produced ${cells.length}/${expectedCellCount} cells, falling back to standard division`);
    return { cells: calculateManualCellBounds(rows, cols, canvas.width, canvas.height, false), gaps: null, exteriorMargins: null };
  }
  
  return { cells, gaps, exteriorMargins };
}

// ============= LEGACY MARGIN DETECTION (Fallback) =============

/**
 * Detect cell margins by scanning from edges
 */
export function detectCellMargins(
  canvas: HTMLCanvasElement,
  cell: CellBounds,
  tolerance: number = 30
): MarginInfo {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { top: 0, right: 0, bottom: 0, left: 0, color: { r: 255, g: 255, b: 255 }, detected: false };
  
  // Sample corners to detect margin color
  const corners = [
    { x: cell.x + 2, y: cell.y + 2 },
    { x: cell.x + cell.width - 3, y: cell.y + 2 },
    { x: cell.x + 2, y: cell.y + cell.height - 3 },
    { x: cell.x + cell.width - 3, y: cell.y + cell.height - 3 },
  ];
  
  let r = 0, g = 0, b = 0, count = 0;
  for (const corner of corners) {
    const x = Math.max(0, Math.min(corner.x, canvas.width - 1));
    const y = Math.max(0, Math.min(corner.y, canvas.height - 1));
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    r += pixel[0];
    g += pixel[1];
    b += pixel[2];
    count++;
  }
  
  const marginColor: RGB = { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
  
  // Check if it's a neutral/margin color (white, grey)
  const isNeutral = (
    Math.abs(marginColor.r - marginColor.g) < 25 &&
    Math.abs(marginColor.g - marginColor.b) < 25 &&
    marginColor.r > 80
  );
  
  if (!isNeutral) {
    return { top: 0, right: 0, bottom: 0, left: 0, color: marginColor, detected: false };
  }
  
  const maxScan = Math.min(50, Math.floor(Math.min(cell.width, cell.height) * 0.25));
  
  let top = 0, right = 0, bottom = 0, left = 0;
  
  // Scan from each edge
  for (let offset = 0; offset < maxScan; offset++) {
    if (isHorizontalLineMargin(ctx, cell.y + offset, cell.x, cell.x + cell.width, marginColor, tolerance)) {
      top = offset + 1;
    } else break;
  }
  
  for (let offset = 0; offset < maxScan; offset++) {
    if (isHorizontalLineMargin(ctx, cell.y + cell.height - 1 - offset, cell.x, cell.x + cell.width, marginColor, tolerance)) {
      bottom = offset + 1;
    } else break;
  }
  
  for (let offset = 0; offset < maxScan; offset++) {
    if (isVerticalLineMargin(ctx, cell.x + offset, cell.y, cell.y + cell.height, marginColor, tolerance)) {
      left = offset + 1;
    } else break;
  }
  
  for (let offset = 0; offset < maxScan; offset++) {
    if (isVerticalLineMargin(ctx, cell.x + cell.width - 1 - offset, cell.y, cell.y + cell.height, marginColor, tolerance)) {
      right = offset + 1;
    } else break;
  }
  
  const detected = [top, right, bottom, left].filter(m => m > 2).length >= 2;
  
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
