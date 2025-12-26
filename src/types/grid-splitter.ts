export interface DetectedImage {
  id: string;
  blob: Blob;
  dataUrl: string;
  order: number;
  selected: boolean;
  // Dimensions for validation
  width?: number;
  height?: number;
}

export interface GridConfig {
  rows: number;
  cols: number;
}

export interface AspectRatioOption {
  label: string;
  value: number | null; // null = original
  description: string;
}

export const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { label: 'Original', value: null, description: 'Manter proporção original' },
  { label: '3:4', value: 3/4, description: 'Instagram Stories/Carrossel' },
  { label: '4:5', value: 4/5, description: 'Feed Instagram' },
  { label: '1:1', value: 1, description: 'Quadrado' },
  { label: '16:9', value: 16/9, description: 'YouTube/Landscape' },
];

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
