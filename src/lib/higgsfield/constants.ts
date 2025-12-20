// Higgsfield AI Constants

import { Square, Smartphone, Monitor, MonitorPlay } from 'lucide-react';

export const HIGGSFIELD_ASPECT_RATIOS = [
  { value: '1:1' as const, label: 'Quadrado (1:1)', description: 'Ideal para posts do feed' },
  { value: '3:4' as const, label: 'Retrato (3:4)', description: 'Formato Instagram padrão' },
  { value: '4:3' as const, label: 'Paisagem (4:3)', description: 'Ideal para fotografias' },
  { value: '9:16' as const, label: 'Story/Reel (9:16)', description: 'Formato vertical completo' },
  { value: '16:9' as const, label: 'Widescreen (16:9)', description: 'Formato cinematográfico' },
];

export const HIGGSFIELD_RESOLUTIONS = [
  { value: '720p' as const, label: 'HD (720p)', price: '~$0.09/imagem' },
  { value: '1080p' as const, label: 'Full HD (1080p)', price: '~$0.19/imagem' },
];

// Polling and timeout configuration
export const HIGGSFIELD_POLL_INTERVAL = 3000; // 3 seconds
export const HIGGSFIELD_TIMEOUT = 300000; // 5 minutes
export const HIGGSFIELD_MAX_RETRIES = 3;
export const HIGGSFIELD_MAX_PARALLEL_JOBS = 3;

// Validation limits
export const HIGGSFIELD_MAX_PROMPT_LENGTH = 2000;
export const HIGGSFIELD_MIN_IMAGES = 1;
export const HIGGSFIELD_MAX_IMAGES = 9;
