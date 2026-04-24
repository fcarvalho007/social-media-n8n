import { SocialNetwork } from '@/types/social';

export type HashtagGroup = 'reach' | 'niche' | 'brand';
export type HashtagStatus = 'good' | 'saturated' | 'risk';
export type CaptionRewriteTone = 'direto' | 'emocional' | 'técnico' | 'neutro' | 'mais_curto' | 'mais_forte';

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
  volumeEstimate?: number;
  source?: string;
  verifiedAt?: string;
}

export interface EditorialAssistantResult {
  draft_title: string;
  base_caption: string;
  captions_per_network: Partial<Record<SocialNetwork, string>>;
  hashtags: {
    reach: string[];
    niche: string[];
    brand: string[];
  };
  first_comment: string;
  alt_text: string;
  key_quotes: string[];
  raw_transcription: string;
  rewrites?: CaptionRewriteMetadata[];
}

export interface AiPreferences {
  preferred_language: string;
  default_tone: 'direto' | 'emocional' | 'técnico' | 'neutro';
  brand_hashtags: string[];
  insights_enabled: boolean;
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
  metadata?: Record<string, unknown>;
  last_updated: string;
}
