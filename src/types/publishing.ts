export type PublishTarget = 'instagram' | 'linkedin';

export type PostType = 'single_image' | 'carousel' | 'video' | 'text_only';

export interface PublishConfig {
  targets: {
    instagram: boolean;
    linkedin: boolean;
  };
  postType: PostType;
  title?: string;
  body: string;
  hashtags: string[];
  media: MediaItem[];
  video?: VideoItem;
  scheduleAt?: Date;
}

export interface MediaItem {
  type: 'image';
  src: string;
  alt?: string;
  order: number;
}

export interface VideoItem {
  src: string;
  durationSec: number;
  thumbnailUrl?: string;
}

export interface ValidationRule {
  field: string;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface PlatformValidation {
  platform: PublishTarget;
  valid: boolean;
  errors: ValidationRule[];
  warnings: ValidationRule[];
}

export interface PublishProgress {
  platform: PublishTarget;
  status: 'pending' | 'validating' | 'uploading' | 'publishing' | 'done' | 'error';
  progress: number;
  message?: string;
  error?: string;
  postUrl?: string;
  startedAt?: string;
  publishedAt?: string;
  technicalDetails?: any;
}

export const INSTAGRAM_CONFIG = {
  memberUrn: 'not-applicable',
  accountId: '68fb951d8bbca9c10cbfef93',
};

export const LINKEDIN_CONFIG = {
  memberUrn: 'urn:li:person:ojg2Ri_Otv',
  accountId: 'not-applicable',
};

export const YOUTUBE_CONFIG = {
  accountId: '69344efdf43160a0bc99a480',
};

export const FACEBOOK_CONFIG = {
  accountId: '69344f55f43160a0bc99a481',
};

export const TIKTOK_CONFIG = {
  accountId: '69344fdef43160a0bc99a484',
};

export const GOOGLEBUSINESS_CONFIG = {
  accountId: '694565844207e06f4ca82044',
};

// Map format to account configuration
export const FORMAT_TO_ACCOUNT: Record<string, string> = {
  // Instagram
  instagram_carousel: INSTAGRAM_CONFIG.accountId,
  instagram_image: INSTAGRAM_CONFIG.accountId,
  instagram_stories: INSTAGRAM_CONFIG.accountId,
  instagram_reel: INSTAGRAM_CONFIG.accountId,
  // LinkedIn
  linkedin_post: LINKEDIN_CONFIG.memberUrn,
  linkedin_document: LINKEDIN_CONFIG.memberUrn,
  // YouTube
  youtube_shorts: YOUTUBE_CONFIG.accountId,
  youtube_video: YOUTUBE_CONFIG.accountId,
  // TikTok
  tiktok_video: TIKTOK_CONFIG.accountId,
  // Facebook
  facebook_image: FACEBOOK_CONFIG.accountId,
  facebook_stories: FACEBOOK_CONFIG.accountId,
  facebook_reel: FACEBOOK_CONFIG.accountId,
  // Google Business
  googlebusiness_post: GOOGLEBUSINESS_CONFIG.accountId,
};

// Map format to network name
export const FORMAT_TO_NETWORK: Record<string, string> = {
  instagram_carousel: 'instagram',
  instagram_image: 'instagram',
  instagram_stories: 'instagram',
  instagram_reel: 'instagram',
  linkedin_post: 'linkedin',
  linkedin_document: 'linkedin',
  youtube_shorts: 'youtube',
  youtube_video: 'youtube',
  tiktok_video: 'tiktok',
  facebook_image: 'facebook',
  facebook_stories: 'facebook',
  facebook_reel: 'facebook',
  googlebusiness_post: 'googlebusiness',
};

export const PLATFORM_CONSTRAINTS = {
  instagram: {
    caption: {
      maxLength: 2200,
      field: 'Caption',
    },
    hashtags: {
      maxCount: 30,
      field: 'Hashtags',
    },
    carousel: {
      minImages: 2,
      maxImages: 10,
      field: 'Carousel Images',
    },
    video: {
      minDuration: 3,
      maxDuration: 90,
      maxSizeMB: 650,
      field: 'Video',
    },
    image: {
      recommendedAspects: ['4:5', '9:16'],
      minWidthPx: 1080,
    },
  },
  linkedin: {
    body: {
      maxLength: 3000,
      field: 'Body Text',
    },
    hashtags: {
      recommendedCount: 5,
      field: 'Hashtags',
    },
    carousel: {
      minImages: 1,
      maxImages: 300,
      field: 'Carousel Images (as Document)',
      recommendedMin: 8,
      recommendedMax: 12,
    },
    video: {
      maxDurationMin: 10,
      field: 'Video',
    },
    image: {
      maxCount: 9,
      recommendedAspects: ['1.91:1', '1:1'],
    },
  },
};
