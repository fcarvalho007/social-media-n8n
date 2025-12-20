// Unified media types for carousel integration

export type MediaSource = 'upload' | 'grid' | 'ai';

export interface CarouselMediaItem {
  id: string;
  file: File;
  objectUrl: string;
  order: number;
  source: MediaSource;
  selected: boolean;
}

export interface MediaState {
  items: CarouselMediaItem[];
  coverIndex: number; // First image by default (index 0)
  isUploading: boolean;
}

export interface MediaUploadResult {
  url: string;
  fileName: string;
  source: MediaSource;
}
