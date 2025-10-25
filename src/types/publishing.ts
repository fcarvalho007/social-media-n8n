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
      minImages: 2,
      maxImages: 9,
      field: 'Carousel Images (as Document)',
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
