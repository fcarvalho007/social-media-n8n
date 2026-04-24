import type { SocialNetwork } from '@/types/social';

export interface PostMetrics {
  reach?: number | null;
  impressions?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  clicks?: number | null;
  video_completion_rate?: number | null;
}

export type PerformanceClassification = 'above_average' | 'worked' | 'normal' | 'did_not_work' | 'insufficient_data';

export interface PostFeatures {
  caption_length: number;
  has_question_in_first_sentence: boolean;
  starts_with_number: boolean;
  has_emoji_in_first_line: boolean;
  has_line_breaks: boolean;
  hashtag_count: number;
  hashtag_types: ('reach' | 'niche' | 'brand')[];
  has_first_comment: boolean;
  has_alt_text: boolean;
  has_link_in_caption: boolean;
  media_type: 'image' | 'video' | 'carousel' | 'text_only';
  media_count: number;
  video_duration_seconds?: number;
  published_at_hour: number;
  published_at_day_of_week: number;
  detected_tone?: 'direct' | 'emotional' | 'technical' | 'humor' | 'neutral';
}

export const calculateEngagementRate = (metrics: PostMetrics): number => {
  const weighted =
    (Number(metrics.likes) || 0) +
    (Number(metrics.comments) || 0) * 2 +
    (Number(metrics.shares) || 0) * 3 +
    (Number(metrics.saves) || 0) * 2;
  const reach = Number(metrics.reach) || 0;
  return reach > 0 ? weighted / reach : 0;
};

export const average = (values: number[]) => {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
};

export const standardDeviation = (values: number[]) => {
  const clean = values.filter(Number.isFinite);
  if (clean.length < 2) return 0;
  const mean = average(clean);
  const variance = clean.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (clean.length - 1);
  return Math.sqrt(variance);
};

export const classifyPerformance = (rate: number, previousRates: number[]): PerformanceClassification => {
  const base = previousRates.filter(Number.isFinite).slice(0, 30);
  if (base.length < 10) return 'insufficient_data';
  const mean = average(base);
  const stdDev = standardDeviation(base);
  if (rate > mean + stdDev) return 'above_average';
  if (rate > mean) return 'worked';
  if (rate < mean - stdDev) return 'did_not_work';
  return 'normal';
};

const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const linkRegex = /https?:\/\/|www\./i;
const hashtagRegex = /#[\p{L}\p{N}_]+/gu;

export function extractPostFeatures(post: {
  caption?: string | null;
  hashtags?: string[] | null;
  first_comment?: string | null;
  alt_texts?: unknown;
  media_items?: unknown;
  template_a_images?: string[] | null;
  selected_networks?: SocialNetwork[] | null;
  post_type?: string | null;
  content_type?: string | null;
  published_at?: string | null;
}, detectedTone?: PostFeatures['detected_tone']): PostFeatures {
  const caption = post.caption || '';
  const firstSentence = caption.split(/[.!?\n]/)[0] || '';
  const firstLine = caption.split('\n')[0] || '';
  const hashtags = caption.match(hashtagRegex) ?? post.hashtags ?? [];
  const mediaItems = Array.isArray(post.media_items) ? post.media_items as Array<{ type?: string; isVideo?: boolean; duration?: number }> : [];
  const fallbackMediaCount = Array.isArray(post.template_a_images) ? post.template_a_images.length : 0;
  const mediaCount = mediaItems.length || fallbackMediaCount;
  const hasVideo = mediaItems.some(item => item.type === 'video' || item.isVideo);
  const mediaType = mediaCount === 0 ? 'text_only' : mediaCount > 1 ? 'carousel' : hasVideo || post.post_type?.includes('video') || post.post_type?.includes('reel') ? 'video' : 'image';
  const published = post.published_at ? new Date(post.published_at) : new Date();

  return {
    caption_length: caption.length,
    has_question_in_first_sentence: firstSentence.includes('?'),
    starts_with_number: /^\s*\d/.test(caption),
    has_emoji_in_first_line: emojiRegex.test(firstLine),
    has_line_breaks: caption.includes('\n'),
    hashtag_count: hashtags.length,
    hashtag_types: [],
    has_first_comment: Boolean(post.first_comment?.trim()),
    has_alt_text: Boolean(post.alt_texts && JSON.stringify(post.alt_texts) !== '{}'),
    has_link_in_caption: linkRegex.test(caption),
    media_type: mediaType,
    media_count: mediaCount,
    video_duration_seconds: mediaItems.find(item => Number(item.duration))?.duration,
    published_at_hour: published.getHours(),
    published_at_day_of_week: published.getDay(),
    detected_tone: detectedTone,
  };
}
