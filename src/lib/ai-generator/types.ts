// AI Image Generator Types

import { AIModelId, AIAspectRatio } from './constants';

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
