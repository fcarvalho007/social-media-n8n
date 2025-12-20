// AI Image Generator Constants

export const AI_IMAGE_MODELS = [
  {
    id: 'nano-banana-pro' as const,
    name: 'Nano Banana Pro',
    provider: 'lovable' as const,
    model: 'google/gemini-2.5-flash-image-preview',
    icon: '🍌',
    description: 'Rápido e gratuito',
  },
  {
    id: 'gpt-image-1.5' as const,
    name: 'GPT Image 1.5',
    provider: 'fal' as const,
    model: 'fal-ai/gpt-image-1',
    icon: '🤖',
    description: 'Alta qualidade (fal.ai)',
  },
] as const;

export type AIModelId = typeof AI_IMAGE_MODELS[number]['id'];

export const AI_ASPECT_RATIOS = [
  { value: '1:1', label: '1:1', description: 'Quadrado' },
  { value: '3:4', label: '3:4', description: 'Retrato' },
  { value: '4:3', label: '4:3', description: 'Paisagem' },
  { value: '9:16', label: '9:16', description: 'Story/Reel' },
  { value: '16:9', label: '16:9', description: 'Widescreen' },
] as const;

export type AIAspectRatio = typeof AI_ASPECT_RATIOS[number]['value'];

// Validation limits
export const AI_MAX_PROMPT_LENGTH = 2000;
export const AI_MIN_IMAGES = 1;
export const AI_MAX_IMAGES = 9;

// Video formats that don't support AI image generation
export const VIDEO_ONLY_FORMATS = [
  'instagram_reel',
  'instagram_stories',
  'youtube_shorts',
  'youtube_video',
  'tiktok_video',
  'facebook_reel',
] as const;
