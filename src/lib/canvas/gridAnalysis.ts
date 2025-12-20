/**
 * Grid analysis utilities for detecting separators in images
 */

import { getRowVariance, getColumnVariance, getAverageColor, rgbToHex } from './imageProcessing';

export interface SeparatorLine {
  position: number;      // center pixel position
  start: number;         // start of separator region
  end: number;           // end of separator region
  width: number;         // separator thickness
  variance: number;      // average variance (lower = more uniform)
  confidence: number;    // 0-1 confidence score
}

export interface GridValidation {
  isValid: boolean;
  rows: number;
  cols: number;
  confidence: number;
  cellWidths: number[];
  cellHeights: number[];
  message?: string;
}

/**
 * Detect horizontal separator lines in the image
 * Uses variance analysis to find rows with uniform color
 */
export function detectHorizontalSeparators(
  imageData: ImageData,
  sensitivity: number,
  minCellSize: number = 50
): SeparatorLine[] {
  const { height } = imageData;
  
  // Calculate variance threshold based on sensitivity (1-100)
  // Higher sensitivity = lower threshold = more lines detected
  const baseThreshold = 800; // Base variance threshold
  const varianceThreshold = baseThreshold * ((101 - sensitivity) / 50);
  
  const lineVariances: { y: number; variance: number }[] = [];

  // Calculate variance for each row
  for (let y = 0; y < height; y++) {
    const variance = getRowVariance(imageData, y);
    lineVariances.push({ y, variance });
  }

  // Find candidate separator lines (low variance)
  const candidates = lineVariances.filter(l => l.variance < varianceThreshold);

  // Group consecutive candidates into separator regions
  const groups = groupConsecutiveLines(candidates, 'y');

  // Filter groups that are too thin (noise) or represent cell content
  const separators = groups
    .filter(g => g.lines.length >= 2) // At least 2px thick
    .map(g => {
      const avgVariance = g.lines.reduce((sum, l) => sum + l.variance, 0) / g.lines.length;
      const start = g.lines[0].y;
      const end = g.lines[g.lines.length - 1].y;
      const width = end - start + 1;
      const position = Math.floor((start + end) / 2);
      
      // Calculate confidence based on variance uniformity
      const confidence = Math.max(0, Math.min(1, 1 - (avgVariance / baseThreshold)));

      return {
        position,
        start,
        end,
        width,
        variance: avgVariance,
        confidence
      };
    })
    .filter(s => s.confidence > 0.1); // Filter very low confidence

  // Ensure minimum cell size between separators
  return filterByMinCellSize(separators, height, minCellSize);
}

/**
 * Detect vertical separator lines in the image
 */
export function detectVerticalSeparators(
  imageData: ImageData,
  sensitivity: number,
  minCellSize: number = 50
): SeparatorLine[] {
  const { width } = imageData;
  
  const baseThreshold = 800;
  const varianceThreshold = baseThreshold * ((101 - sensitivity) / 50);
  
  const lineVariances: { x: number; variance: number }[] = [];

  // Calculate variance for each column
  for (let x = 0; x < width; x++) {
    const variance = getColumnVariance(imageData, x);
    lineVariances.push({ x, variance });
  }

  // Find candidate separator lines
  const candidates = lineVariances.filter(l => l.variance < varianceThreshold);

  // Group consecutive candidates
  const groups = groupConsecutiveLines(candidates, 'x');

  // Filter and create separator objects
  const separators = groups
    .filter(g => g.lines.length >= 2)
    .map(g => {
      const avgVariance = g.lines.reduce((sum, l) => sum + l.variance, 0) / g.lines.length;
      const start = g.lines[0].x;
      const end = g.lines[g.lines.length - 1].x;
      const width = end - start + 1;
      const position = Math.floor((start + end) / 2);
      const confidence = Math.max(0, Math.min(1, 1 - (avgVariance / baseThreshold)));

      return {
        position,
        start,
        end,
        width,
        variance: avgVariance,
        confidence
      };
    })
    .filter(s => s.confidence > 0.1);

  return filterByMinCellSize(separators, width, minCellSize);
}

/**
 * Group consecutive lines into separator regions
 */
function groupConsecutiveLines<T extends { [key: string]: number }>(
  lines: T[],
  positionKey: keyof T
): { lines: T[] }[] {
  if (lines.length === 0) return [];

  const groups: { lines: T[] }[] = [];
  let currentGroup: T[] = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    const prevPos = lines[i - 1][positionKey] as number;
    const currPos = lines[i][positionKey] as number;

    if (currPos - prevPos <= 2) { // Allow small gaps
      currentGroup.push(lines[i]);
    } else {
      if (currentGroup.length > 0) {
        groups.push({ lines: currentGroup });
      }
      currentGroup = [lines[i]];
    }
  }

  if (currentGroup.length > 0) {
    groups.push({ lines: currentGroup });
  }

  return groups;
}

/**
 * Filter separators to ensure minimum cell size between them
 */
function filterByMinCellSize(
  separators: SeparatorLine[],
  totalSize: number,
  minCellSize: number
): SeparatorLine[] {
  if (separators.length === 0) return [];

  // Sort by position
  const sorted = [...separators].sort((a, b) => a.position - b.position);
  
  // Remove separators too close to edges
  const edgeMargin = Math.min(minCellSize / 2, 20);
  const filtered = sorted.filter(s => 
    s.position > edgeMargin && 
    s.position < totalSize - edgeMargin
  );

  if (filtered.length === 0) return [];

  // Filter separators too close to each other
  const result: SeparatorLine[] = [filtered[0]];
  
  for (let i = 1; i < filtered.length; i++) {
    const lastPos = result[result.length - 1].position;
    const currPos = filtered[i].position;
    
    if (currPos - lastPos >= minCellSize) {
      result.push(filtered[i]);
    } else if (filtered[i].confidence > result[result.length - 1].confidence) {
      // Keep the higher confidence separator
      result[result.length - 1] = filtered[i];
    }
  }

  return result;
}

/**
 * Validate the detected grid structure
 */
export function validateGridStructure(
  hSeparators: SeparatorLine[],
  vSeparators: SeparatorLine[],
  imgWidth: number,
  imgHeight: number
): GridValidation {
  const rows = hSeparators.length + 1;
  const cols = vSeparators.length + 1;

  // Calculate cell dimensions
  const hPositions = [0, ...hSeparators.map(s => s.position), imgHeight];
  const vPositions = [0, ...vSeparators.map(s => s.position), imgWidth];

  const cellHeights: number[] = [];
  for (let i = 1; i < hPositions.length; i++) {
    cellHeights.push(hPositions[i] - hPositions[i - 1]);
  }

  const cellWidths: number[] = [];
  for (let i = 1; i < vPositions.length; i++) {
    cellWidths.push(vPositions[i] - vPositions[i - 1]);
  }

  // Calculate regularity (how uniform are the cells)
  const avgHeight = cellHeights.reduce((a, b) => a + b, 0) / cellHeights.length;
  const avgWidth = cellWidths.reduce((a, b) => a + b, 0) / cellWidths.length;
  
  const heightVariance = cellHeights.reduce((sum, h) => sum + Math.pow(h - avgHeight, 2), 0) / cellHeights.length;
  const widthVariance = cellWidths.reduce((sum, w) => sum + Math.pow(w - avgWidth, 2), 0) / cellWidths.length;

  const heightCV = Math.sqrt(heightVariance) / avgHeight; // Coefficient of variation
  const widthCV = Math.sqrt(widthVariance) / avgWidth;

  // Calculate overall confidence
  const avgConfidence = (
    hSeparators.reduce((sum, s) => sum + s.confidence, 0) +
    vSeparators.reduce((sum, s) => sum + s.confidence, 0)
  ) / (hSeparators.length + vSeparators.length || 1);

  const regularityScore = Math.max(0, 1 - (heightCV + widthCV) / 2);
  
  let confidence: number;
  
  if (hSeparators.length === 0 && vSeparators.length === 0) {
    confidence = 0;
  } else {
    confidence = (avgConfidence * 0.6 + regularityScore * 0.4);
  }

  let message: string | undefined;
  
  if (confidence < 0.3) {
    message = 'Não foi possível detetar uma grelha clara. Experimente o modo manual.';
  } else if (confidence < 0.5) {
    message = 'Grelha detetada com baixa confiança. Verifique o resultado.';
  } else if (heightCV > 0.3 || widthCV > 0.3) {
    message = 'Grelha irregular detetada. Células têm tamanhos variados.';
  }

  return {
    isValid: confidence >= 0.3,
    rows,
    cols,
    confidence,
    cellWidths,
    cellHeights,
    message
  };
}

/**
 * Detect the color of the separators
 */
export function findSeparatorColor(
  imageData: ImageData,
  hSeparators: SeparatorLine[],
  vSeparators: SeparatorLine[],
  imgWidth: number,
  imgHeight: number
): string | null {
  if (hSeparators.length === 0 && vSeparators.length === 0) {
    return null;
  }

  // Sample colors from separator lines
  const colors: { r: number; g: number; b: number }[] = [];

  // Sample from horizontal separators
  for (const sep of hSeparators) {
    const sampleX = Math.floor(imgWidth / 2);
    colors.push(getAverageColor(imageData, sampleX, sep.position, 3));
  }

  // Sample from vertical separators
  for (const sep of vSeparators) {
    const sampleY = Math.floor(imgHeight / 2);
    colors.push(getAverageColor(imageData, sep.position, sampleY, 3));
  }

  if (colors.length === 0) return null;

  // Average all sampled colors
  const avgColor = {
    r: Math.round(colors.reduce((s, c) => s + c.r, 0) / colors.length),
    g: Math.round(colors.reduce((s, c) => s + c.g, 0) / colors.length),
    b: Math.round(colors.reduce((s, c) => s + c.b, 0) / colors.length)
  };

  return rgbToHex(avgColor.r, avgColor.g, avgColor.b);
}
