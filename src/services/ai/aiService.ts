import { supabase } from '@/integrations/supabase/client';
import { AIServiceError } from '@/lib/errorHandler';
import type { FirstCommentOption, HashtagAssistantResult, TranscriptSegment } from '@/types/aiEditorial';
import type { SocialNetwork } from '@/types/social';

export type AIModelAlias = 'fast' | 'smart';
export type AIResponseFormat = 'text' | 'json';

export interface GenerateTextParams {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: AIResponseFormat;
  model?: AIModelAlias;
  feature?: string;
  creditCostOverride?: number;
}

export interface GenerateHashtagsParams {
  caption: string;
  transcription?: string;
  networks: SocialNetwork[];
  brandHashtags?: string[];
  creditCostOverride?: number;
}

export interface TranscriptionResult {
  text: string;
  segments?: TranscriptSegment[];
}

type AICoreResponse<T> = {
  success?: boolean;
  result?: T;
  error?: string;
  code?: 'rate_limit' | 'insufficient_credits' | 'timeout' | 'generic';
};

async function invokeAICore<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<AICoreResponse<T>>('ai-core', { body });

  if (error) {
    throw new AIServiceError(error.message, 'generic');
  }

  if (!data?.success) {
    throw new AIServiceError(data?.error || 'A IA está temporariamente indisponível.', data?.code || 'generic');
  }

  return data.result as T;
}

export const aiService = {
  transcribeMedia(fileUrl: string, options?: { language?: string; feature?: string; creditCostOverride?: number; includeSegments?: boolean }) {
    return invokeAICore<string | TranscriptionResult>({
      action: 'transcription',
      fileUrl,
      options: { language: options?.language, includeSegments: options?.includeSegments },
      feature: options?.feature || 'shared_ai_service',
      creditCostOverride: options?.creditCostOverride,
    });
  },

  generateText(params: GenerateTextParams) {
    return invokeAICore<string | unknown>({ action: 'text_generation', ...params, feature: params.feature || 'shared_ai_service' });
  },

  analyzeImage(imageUrl: string, prompt: string) {
    return invokeAICore<string>({ action: 'vision', imageUrl, prompt, feature: 'shared_ai_service' });
  },

  generateHashtags(params: GenerateHashtagsParams) {
    return invokeAICore<HashtagAssistantResult>({ action: 'hashtag_generation', ...params, feature: 'hashtag_assistant', creditCostOverride: params.creditCostOverride ?? 1 });
  },

  generateFirstComments(params: { caption: string; network: SocialNetwork }) {
    return invokeAICore<{ options: FirstCommentOption[] }>({ action: 'first_comment_generation', caption: params.caption, network: params.network, networks: [params.network], feature: 'first_comment_ai', model: 'fast', creditCostOverride: 1 });
  },

  generateVideoChapters(params: { transcription: string; segments?: TranscriptSegment[] }) {
    return invokeAICore<{ chapters: { time: string; title: string }[] }>({ action: 'video_chapters', ...params, feature: 'video_chapters', model: 'fast', creditCostOverride: 2 });
  },

  extractVideoQuotes(params: { transcription: string; segments?: TranscriptSegment[] }) {
    return invokeAICore<{ quotes: { time: string; text: string }[] }>({ action: 'video_quotes', ...params, feature: 'video_quotes', model: 'fast', creditCostOverride: 1 });
  },

  generateInsightQuestions(params: { caption: string; transcription?: string; finding: string }) {
    return invokeAICore<{ questions: string[] }>({ action: 'insight_question_suggestions', ...params, feature: 'insight_question_suggestions', model: 'fast', creditCostOverride: 1 });
  },
};
