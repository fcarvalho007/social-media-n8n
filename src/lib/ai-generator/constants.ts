// AI Image Generator Constants

import { 
  AIModelConfig, 
  AIAspectRatio, 
  AIResolution, 
  AIQuality, 
  AIImageSize,
  NanoBananaPricing,
  GPTImagePricing 
} from './types';

// Real fal.ai pricing (as of Dec 2024)
export const AI_IMAGE_MODELS: AIModelConfig[] = [
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    provider: 'fal',
    model: 'fal-ai/nano-banana-pro',
    icon: '🍌',
    description: 'Google Gemini',
    pricing: {
      '1K': 0.15,
      '2K': 0.15,
      '4K': 0.30,  // Double price for 4K
    } as NanoBananaPricing,
  },
  {
    id: 'gpt-image-1.5',
    name: 'GPT Image 1.5',
    provider: 'fal',
    model: 'fal-ai/gpt-image-1',
    icon: '🤖',
    description: 'OpenAI',
    pricing: {
      low: { '1024x1024': 0.009, '1536x1024': 0.013, '1024x1536': 0.013 },
      medium: { '1024x1024': 0.034, '1536x1024': 0.050, '1024x1536': 0.051 },
      high: { '1024x1024': 0.133, '1536x1024': 0.199, '1024x1536': 0.200 },
    } as GPTImagePricing,
  },
];

// Aspect ratios for Nano Banana Pro
export const NANO_BANANA_ASPECT_RATIOS: { value: AIAspectRatio; label: string; description: string }[] = [
  { value: '1:1', label: '1:1', description: 'Quadrado' },
  { value: '3:4', label: '3:4', description: 'Retrato' },
  { value: '4:3', label: '4:3', description: 'Paisagem' },
  { value: '9:16', label: '9:16', description: 'Story/Reel' },
  { value: '16:9', label: '16:9', description: 'Widescreen' },
  { value: '3:2', label: '3:2', description: 'Foto clássica' },
  { value: '2:3', label: '2:3', description: 'Foto vertical' },
  { value: '4:5', label: '4:5', description: 'Instagram' },
  { value: '5:4', label: '5:4', description: 'Monitor' },
  { value: '21:9', label: '21:9', description: 'Ultra-wide' },
];

// Resolutions for Nano Banana Pro
export const NANO_BANANA_RESOLUTIONS: { value: AIResolution; label: string; description: string; costMultiplier: number }[] = [
  { value: '1K', label: '1K', description: '~1024px', costMultiplier: 1 },
  { value: '2K', label: '2K', description: '~2048px', costMultiplier: 1 },
  { value: '4K', label: '4K', description: '~4096px', costMultiplier: 2 },
];

// Image sizes for GPT Image 1.5
export const GPT_IMAGE_SIZES: { value: AIImageSize; label: string; description: string }[] = [
  { value: '1024x1024', label: '1024×1024', description: 'Quadrado' },
  { value: '1536x1024', label: '1536×1024', description: 'Paisagem' },
  { value: '1024x1536', label: '1024×1536', description: 'Retrato' },
];

// Quality levels for GPT Image 1.5
export const GPT_IMAGE_QUALITIES: { value: AIQuality; label: string; description: string }[] = [
  { value: 'low', label: 'Baixa', description: 'Rápido, económico' },
  { value: 'medium', label: 'Média', description: 'Equilibrado' },
  { value: 'high', label: 'Alta', description: 'Melhor qualidade' },
];

// Validation limits
export const AI_MAX_PROMPT_LENGTH = 2000;
export const AI_MIN_IMAGES = 1;
export const AI_MAX_IMAGES = 9;

// Helper function to get model by id
export function getModelById(id: string): AIModelConfig | undefined {
  return AI_IMAGE_MODELS.find(m => m.id === id);
}

// Calculate cost for Nano Banana Pro
export function calculateNanoBananaCost(resolution: AIResolution, count: number): number {
  const model = AI_IMAGE_MODELS.find(m => m.id === 'nano-banana-pro');
  if (!model) return 0;
  const pricing = model.pricing as NanoBananaPricing;
  return pricing[resolution] * count;
}

// Calculate cost for GPT Image 1.5
export function calculateGPTImageCost(quality: AIQuality, imageSize: AIImageSize, count: number): number {
  const model = AI_IMAGE_MODELS.find(m => m.id === 'gpt-image-1.5');
  if (!model) return 0;
  const pricing = model.pricing as GPTImagePricing;
  return pricing[quality][imageSize] * count;
}

// Get formatted cost display
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

// Get minimum price for a model
export function getMinPrice(modelId: string): number {
  const model = getModelById(modelId);
  if (!model) return 0;
  
  if (modelId === 'nano-banana-pro') {
    return 0.15;
  } else {
    return 0.009; // Low quality 1024x1024
  }
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
