// AI Image Generator Types

export type AIModelId = 'nano-banana-pro' | 'gpt-image-1.5';
export type AIProvider = 'lovable' | 'fal';
export type AIAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

export interface AIModelConfig {
  id: AIModelId;
  name: string;
  provider: AIProvider;
  model: string;
  icon: string;
  description: string;
  cost: string;
  costPerImage: number;
}

export interface AIGenerateParams {
  prompt: string;
  model: AIModelId;
  aspectRatio: AIAspectRatio;
  count: number;
}

export interface AIGenerationJob {
  id: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
  startedAt: number;
}

export interface AIGeneratedImage {
  id: string;
  url: string;
  selected: boolean;
  order: number;
}

export interface AIGenerationState {
  jobs: AIGenerationJob[];
  generatedImages: AIGeneratedImage[];
  isGenerating: boolean;
  error: string | null;
}
