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

export interface GridDetectionProgress {
  stage: 'loading' | 'analyzing' | 'extracting' | 'complete';
  percent: number;
  message: string;
}

export interface GridDetectionResult {
  cells: DetectedImage[];
  gridStructure: { rows: number; cols: number };
  message?: string;
}

export interface GridSplitterState {
  uploadedImage: File | null;
  uploadedImageUrl: string | null;
  detectedImages: DetectedImage[];
  isProcessing: boolean;
  manualConfig: GridConfig;
  removeBorders: boolean;
  error: string | null;
}

export const initialGridSplitterState: GridSplitterState = {
  uploadedImage: null,
  uploadedImageUrl: null,
  detectedImages: [],
  isProcessing: false,
  manualConfig: { rows: 2, cols: 2 },
  removeBorders: false,
  error: null,
};
