// Higgsfield AI Types

export type HiggsfieldAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type HiggsfieldResolution = '720p' | '1080p';
export type HiggsfieldModel = 'google/nano-banana-pro' | 'openai/gpt-image-1-5' | 'higgsfield-ai/soul/standard';

export interface HiggsfieldGenerateParams {
  prompt: string;
  model: HiggsfieldModel;
  aspectRatio: HiggsfieldAspectRatio;
  resolution: HiggsfieldResolution;
  count: number; // 1-9 images
}

export type HiggsfieldJobStatus = 
  | 'pending'
  | 'queued' 
  | 'in_progress' 
  | 'completed' 
  | 'failed' 
  | 'nsfw' 
  | 'cancelled'
  | 'timeout';

export interface HiggsfieldJob {
  id: string;
  requestId: string;
  status: HiggsfieldJobStatus;
  imageUrl?: string;
  error?: string;
  startedAt: number;
}

export interface HiggsfieldGenerationState {
  jobs: HiggsfieldJob[];
  isGenerating: boolean;
  progress: { completed: number; total: number };
  error: string | null;
}

export interface HiggsfieldGeneratedImage {
  id: string;
  url: string;
  selected: boolean;
  order: number;
}

export interface HiggsfieldApiResponse {
  success: boolean;
  requestId?: string;
  status?: HiggsfieldJobStatus;
  imageUrl?: string;
  error?: string;
}
