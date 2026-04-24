import { SocialNetwork } from '@/types/social';

export type HashtagGroup = 'reach' | 'niche' | 'brand';
export type HashtagStatus = 'neutral' | 'risk' | 'banned' | 'over_limit';
export type CaptionRewriteTone = 'direct' | 'emotional' | 'technical' | 'shorter' | 'longer' | 'linkedin' | 'instagram' | 'direto' | 'emocional' | 'técnico' | 'neutro' | 'humor' | 'mais_curto' | 'mais_forte';

export interface TranscriptSegment {
  id?: number;
  start: number;
  end: number;
  text: string;
}

export interface FirstCommentOption {
  approach: 'pergunta' | 'cta_link' | 'complemento';
  text: string;
}

export interface CaptionRewriteMetadata {
  network?: SocialNetwork;
  tone: CaptionRewriteTone;
  created_at: string;
  source: 'caption_rewriter';
}

export interface SuggestedHashtag {
  tag: string;
  group: HashtagGroup;
  status?: HashtagStatus;
  reason?: string;
  riskReason?: string;
  source?: 'ai_editorial' | 'brand' | 'internal_safety' | 'cache';
  verifiedAt?: string;
}

export interface HashtagAssistantResult {
  hashtags: SuggestedHashtag[];
  selectedTags?: string[];
  generated_at?: string;
}

export interface GeneratedFieldState {
  generated_at?: string;
  edited?: boolean;
}

export interface EditorialAssistantResult {
  draft_title: string;
  base_caption: string;
  captions_per_network: Partial<Record<SocialNetwork, string>>;
  hashtags_suggested?: string[];
  hashtags?: {
    reach: string[];
    niche: string[];
    brand: string[];
  };
  first_comment: string;
  alt_text: string;
  alt_texts?: Record<string, string>;
  key_quotes: string[];
  raw_transcription: string;
  transcription_segments?: TranscriptSegment[];
  rewrites?: CaptionRewriteMetadata[];
  hashtag_assistant?: HashtagAssistantResult;
  generated_fields?: Record<string, GeneratedFieldState>;
  upload_assistant?: {
    status?: 'dismissed' | 'transcribed' | 'done';
    generated_at?: string;
    suggestions?: {
      hashtags_suggested?: string[];
      key_quotes?: string[];
      draft_title?: string;
      alt_text?: string;
    };
  };
}

export interface AiPreferences {
  preferred_language: string;
  default_tone: 'direto' | 'emocional' | 'técnico' | 'neutro' | 'humor';
  preferred_model: 'fast' | 'smart';
  brand_hashtags: string[];
  insights_enabled: boolean;
  auto_alt_text: boolean;
  auto_first_comment: boolean;
  muted_insight_types: string[];
  dismissed_insights: Record<string, unknown>;
}

export interface AccountInsight {
  id: string;
  network: SocialNetwork | null;
  format: string | null;
  insight_type: string;
  finding: string;
  confidence: number;
  sample_size: number;
  delta_percentage?: number | null;
  dismissed_until?: string | null;
  dismissed_count?: number;
  never_show?: boolean;
  metadata?: Record<string, unknown>;
  last_updated: string;
}
