import { supabase } from '@/integrations/supabase/client';
import { AIServiceError } from '@/lib/errorHandler';
import type { HashtagAssistantResult } from '@/types/aiEditorial';
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
  transcribeMedia(fileUrl: string, options?: { language?: string; feature?: string; creditCostOverride?: number }) {
    return invokeAICore<string>({
      action: 'transcription',
      fileUrl,
      options: { language: options?.language },
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
};
