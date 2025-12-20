export interface DetectedImage {
  id: string;
  blob: Blob;
  dataUrl: string;
  order: number;
  selected: boolean;
}

export interface GridConfig {
  rows: number;
  cols: number;
}

export interface GridSplitterState {
  uploadedImage: File | null;
  uploadedImageUrl: string | null;
  detectedImages: DetectedImage[];
  isProcessing: boolean;
  detectionMode: 'auto' | 'manual';
  manualConfig: GridConfig;
  sensitivity: number;
  removeBorders: boolean;
  error: string | null;
}

export const initialGridSplitterState: GridSplitterState = {
  uploadedImage: null,
  uploadedImageUrl: null,
  detectedImages: [],
  isProcessing: false,
  detectionMode: 'manual', // Phase 1: manual only
  manualConfig: { rows: 2, cols: 2 },
  sensitivity: 50,
  removeBorders: true,
  error: null,
};
