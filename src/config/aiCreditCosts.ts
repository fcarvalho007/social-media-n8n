export const AI_CREDIT_COSTS = {
  transcription_per_minute: 1,
  text_generation_fast: 1,
  text_generation_smart: 3,
  vision_analysis: 2,
  full_assistant_flow: 5,
} as const;

export type AICreditCostKey = keyof typeof AI_CREDIT_COSTS;
export type AIModelPreference = 'fast' | 'smart';
export type AIActionType = 'transcription' | 'text_generation' | 'vision' | 'client_error';
