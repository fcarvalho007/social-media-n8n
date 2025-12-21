// AI Image Generator Types

export type AIModelId = 'nano-banana-pro' | 'gpt-image-1.5';
export type AIProvider = 'fal';

// Nano Banana Pro specific
export type AIResolution = '1K' | '2K' | '4K';

// GPT Image 1.5 specific
export type AIQuality = 'low' | 'medium' | 'high';
export type AIImageSize = '1024x1024' | '1536x1024' | '1024x1536';

// Common aspect ratios for Nano Banana Pro
export type AIAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '3:2' | '2:3' | '4:5' | '5:4' | '21:9';

export interface NanoBananaPricing {
  '1K': number;
  '2K': number;
  '4K': number;
}

export interface GPTImagePricing {
  low: { '1024x1024': number; '1536x1024': number; '1024x1536': number };
  medium: { '1024x1024': number; '1536x1024': number; '1024x1536': number };
  high: { '1024x1024': number; '1536x1024': number; '1024x1536': number };
}

export interface AIModelConfig {
  id: AIModelId;
  name: string;
  provider: AIProvider;
  model: string;
  icon: string;
  description: string;
  pricing: NanoBananaPricing | GPTImagePricing;
}

export interface AIGenerateParams {
  prompt: string;
  model: AIModelId;
  count: number;
  // Nano Banana Pro params
  aspectRatio?: AIAspectRatio;
  resolution?: AIResolution;
  // GPT Image 1.5 params
  imageSize?: AIImageSize;
  quality?: AIQuality;
}

export interface AIGenerationJob {
  id: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
  startedAt: number;
  cost?: number;
}

export interface AIGeneratedImage {
  id: string;
  url: string;
  selected: boolean;
  order: number;
  cost?: number;
}

export interface AIGenerationState {
  jobs: AIGenerationJob[];
  generatedImages: AIGeneratedImage[];
  isGenerating: boolean;
  error: string | null;
  totalCost: number;
}
