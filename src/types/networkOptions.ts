import { SocialNetwork } from '@/types/social';

export type InstagramFormatVariant = 'feed' | 'story' | 'reel' | 'carousel';
export type FacebookFormatVariant = 'feed' | 'story' | 'reel';
export type YouTubeVisibility = 'public' | 'unlisted' | 'private';
export type GoogleBusinessCtaType = 'book' | 'order_online' | 'buy' | 'learn_more' | 'sign_up' | 'call_now';

const LEGACY_YOUTUBE_CATEGORY_IDS: Record<string, string> = {
  'Film & Animation': '1',
  'Autos & Vehicles': '2',
  Music: '10',
  'Pets & Animals': '15',
  Sports: '17',
  'Travel & Events': '19',
  Gaming: '20',
  'People & Blogs': '22',
  Comedy: '23',
  Entertainment: '24',
  'News & Politics': '25',
  'Howto & Style': '26',
  Education: '27',
  'Science & Technology': '28',
  'Nonprofits & Activism': '29',
};

export interface InstagramPhotoTag {
  username: string;
  x: number;
  y: number;
  slideIndex: number;
}

export interface LinkedInMention {
  profile: string;
  displayName: string;
}

export interface NetworkOptions {
  instagram?: {
    firstComment?: string;
    collaborators?: string[];
    formatVariant?: InstagramFormatVariant;
    photoTags?: InstagramPhotoTag[];
  };
  linkedin?: {
    firstComment?: string;
    mentions?: LinkedInMention[];
    disableLinkPreview?: boolean;
  };
  facebook?: {
    firstComment?: string;
    formatVariant?: FacebookFormatVariant;
  };
  youtube?: {
    title?: string;
    tags?: string[];
    visibility?: YouTubeVisibility;
    categoryId?: string;
    category?: string;
  };
  googlebusiness?: {
    ctaEnabled?: boolean;
    ctaType?: GoogleBusinessCtaType;
    ctaUrl?: string;
  };
}

export type NetworkOptionField =
  | 'firstComment'
  | 'collaborators'
  | 'linkedinMention'
  | 'disableLinkPreview'
  | 'youtubeTitle'
  | 'youtubeTags'
  | 'youtubeVisibility'
  | 'youtubeCategory'
  | 'instagramFormatVariant'
  | 'instagramPhotoTags'
  | 'facebookFormatVariant'
  | 'googleBusinessCta';

export const YOUTUBE_DEFAULT_CATEGORY = 'People & Blogs';
export const YOUTUBE_DEFAULT_CATEGORY_ID = '22';
export const YOUTUBE_DEFAULT_VISIBILITY: YouTubeVisibility = 'public';
export const GOOGLE_BUSINESS_DEFAULT_CTA: GoogleBusinessCtaType = 'learn_more';

export function createDefaultNetworkOptions(): NetworkOptions {
  return {
    instagram: { firstComment: '', collaborators: [], formatVariant: 'feed', photoTags: [] },
    linkedin: { firstComment: '', mentions: [], disableLinkPreview: false },
    facebook: { firstComment: '', formatVariant: 'feed' },
    youtube: {
      title: '',
      tags: [],
      visibility: YOUTUBE_DEFAULT_VISIBILITY,
      categoryId: YOUTUBE_DEFAULT_CATEGORY_ID,
    },
    googlebusiness: { ctaEnabled: false, ctaType: GOOGLE_BUSINESS_DEFAULT_CTA, ctaUrl: '' },
  };
}

export function normalizeNetworkOptions(value: unknown): NetworkOptions {
  const defaults = createDefaultNetworkOptions();
  if (!value || typeof value !== 'object') return defaults;
  const raw = value as NetworkOptions;
  const rawYoutube = raw.youtube ?? {};
  const legacyCategoryId = rawYoutube.category ? LEGACY_YOUTUBE_CATEGORY_IDS[rawYoutube.category] : undefined;
  return {
    instagram: { ...defaults.instagram, ...raw.instagram },
    linkedin: { ...defaults.linkedin, ...raw.linkedin },
    facebook: { ...defaults.facebook, ...raw.facebook },
    youtube: { ...defaults.youtube, ...rawYoutube, categoryId: rawYoutube.categoryId ?? legacyCategoryId ?? defaults.youtube.categoryId },
    googlebusiness: { ...defaults.googlebusiness, ...raw.googlebusiness },
  };
}

export function firstCommentLimit(network: SocialNetwork): number | null {
  if (network === 'instagram') return 2200;
  if (network === 'linkedin') return 1250;
  if (network === 'facebook') return 8000;
  return null;
}