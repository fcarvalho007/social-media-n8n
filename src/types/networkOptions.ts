import { SocialNetwork } from '@/types/social';

export type InstagramFormatVariant = 'feed' | 'story' | 'reel' | 'carousel';
export type FacebookFormatVariant = 'feed' | 'story' | 'reel';
export type YouTubeVisibility = 'public' | 'unlisted' | 'private';
export type GoogleBusinessCtaType = 'book' | 'order_online' | 'buy' | 'learn_more' | 'sign_up' | 'call_now';

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
      category: YOUTUBE_DEFAULT_CATEGORY,
    },
    googlebusiness: { ctaEnabled: false, ctaType: GOOGLE_BUSINESS_DEFAULT_CTA, ctaUrl: '' },
  };
}

export function normalizeNetworkOptions(value: unknown): NetworkOptions {
  const defaults = createDefaultNetworkOptions();
  if (!value || typeof value !== 'object') return defaults;
  const raw = value as NetworkOptions;
  return {
    instagram: { ...defaults.instagram, ...raw.instagram },
    linkedin: { ...defaults.linkedin, ...raw.linkedin },
    facebook: { ...defaults.facebook, ...raw.facebook },
    youtube: { ...defaults.youtube, ...raw.youtube },
    googlebusiness: { ...defaults.googlebusiness, ...raw.googlebusiness },
  };
}

export function firstCommentLimit(network: SocialNetwork): number | null {
  if (network === 'instagram') return 2200;
  if (network === 'linkedin') return 1250;
  if (network === 'facebook') return 8000;
  return null;
}