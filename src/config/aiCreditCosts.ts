export const AI_CREDIT_COSTS = {
  transcription_per_minute: 1,
  text_generation_fast: 1,
  text_generation_smart: 3,
  vision_analysis: 2,
  full_assistant_flow: 5,
  caption_rewrite: 1,
  hashtag_generation: 1,
  first_comment_generation: 1,
  alt_text_generation: 2,
  video_chapters: 2,
  video_quotes: 1,
  insight_question_suggestions: 1,
} as const;

export type AICreditCostKey = keyof typeof AI_CREDIT_COSTS;
export type AIModelPreference = 'fast' | 'smart';
export type AIActionType = 'transcription' | 'text_generation' | 'vision' | 'hashtag_generation' | 'first_comment_generation' | 'video_chapters' | 'video_quotes' | 'insight_question_suggestions' | 'client_error';
