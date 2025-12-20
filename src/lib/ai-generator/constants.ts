// AI Image Generator Constants

import { AIModelConfig, AIAspectRatio } from './types';

export const AI_IMAGE_MODELS: AIModelConfig[] = [
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    provider: 'lovable',
    model: 'google/gemini-2.5-flash-image-preview',
    icon: '🍌',
    description: 'Rápido e incluído',
    cost: 'Gratuito',
    costPerImage: 0,
  },
  {
    id: 'gpt-image-1.5',
    name: 'GPT Image 1.5',
    provider: 'fal',
    model: 'fal-ai/gpt-image-1',
    icon: '🤖',
    description: 'Alta qualidade',
    cost: '~$0.10/img',
    costPerImage: 0.10,
  },
];

export const AI_ASPECT_RATIOS: { value: AIAspectRatio; label: string; description: string }[] = [
  { value: '1:1', label: '1:1', description: 'Quadrado' },
  { value: '3:4', label: '3:4', description: 'Retrato' },
  { value: '4:3', label: '4:3', description: 'Paisagem' },
  { value: '9:16', label: '9:16', description: 'Story/Reel' },
  { value: '16:9', label: '16:9', description: 'Widescreen' },
];

// Validation limits
export const AI_MAX_PROMPT_LENGTH = 2000;
export const AI_MIN_IMAGES = 1;
export const AI_MAX_IMAGES = 9;

// Helper function to get model by id
export function getModelById(id: string): AIModelConfig | undefined {
  return AI_IMAGE_MODELS.find(m => m.id === id);
}

// Helper to calculate total cost
export function calculateTotalCost(modelId: string, count: number): { total: number; display: string } {
  const model = getModelById(modelId);
  if (!model || model.costPerImage === 0) {
    return { total: 0, display: 'Gratuito' };
  }
  const total = model.costPerImage * count;
  return { 
    total, 
    display: `~$${total.toFixed(2)}` 
  };
}

// Video formats that don't support AI image generation
export const VIDEO_ONLY_FORMATS = [
  'instagram_reel',
  'instagram_stories',
  'youtube_shorts',
  'youtube_video',
  'tiktok_video',
  'facebook_reel',
] as const;
