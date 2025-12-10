export type SocialNetwork = 'instagram' | 'linkedin' | 'facebook' | 'x' | 'tiktok' | 'youtube';
export type PostType = 'image' | 'video' | 'carousel' | 'text';
export type PostStatus = 'draft' | 'waiting_for_approval' | 'pending' | 'approved' | 'scheduled' | 'published' | 'rejected' | 'failed';
export type ConnectionStatus = 'connected' | 'expired' | 'missing_permission';

// Post format types for each network
export type PostFormat = 
  // Instagram
  | 'instagram_carousel'
  | 'instagram_image'
  | 'instagram_stories'
  | 'instagram_reel'
  // LinkedIn
  | 'linkedin_post'
  | 'linkedin_document'
  // YouTube
  | 'youtube_shorts'
  | 'youtube_video'
  // TikTok
  | 'tiktok_video'
  // Facebook
  | 'facebook_image'
  | 'facebook_stories'
  | 'facebook_reel';

export interface PostFormatConfig {
  format: PostFormat;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  requiresVideo?: boolean;
  requiresImage?: boolean;
  maxMedia?: number;
  minMedia?: number;
  maxDuration?: number; // seconds for video
}

export const NETWORK_POST_FORMATS: Record<SocialNetwork, PostFormatConfig[]> = {
  instagram: [
    { 
      format: 'instagram_carousel', 
      label: 'Carrossel', 
      description: '1-10 imagens ou vídeos', 
      icon: 'LayoutGrid',
      minMedia: 1,
      maxMedia: 10,
    },
    { 
      format: 'instagram_image', 
      label: 'Post de Imagem', 
      description: 'Imagem estática', 
      icon: 'Image',
      requiresImage: true,
      minMedia: 1,
      maxMedia: 1,
    },
    { 
      format: 'instagram_stories', 
      label: 'Stories', 
      description: 'Imagem ou vídeo', 
      icon: 'Circle',
      minMedia: 1,
      maxMedia: 1,
    },
    { 
      format: 'instagram_reel', 
      label: 'Reel', 
      description: 'Vídeo curto', 
      icon: 'Video',
      requiresVideo: true,
      minMedia: 1,
      maxMedia: 1,
      maxDuration: 90,
    },
  ],
  linkedin: [
    { 
      format: 'linkedin_post', 
      label: 'Post com Legenda', 
      description: 'Texto e imagens', 
      icon: 'FileText',
      minMedia: 0,
      maxMedia: 9,
    },
    { 
      format: 'linkedin_document', 
      label: 'Documento PDF', 
      description: 'Carrossel como PDF', 
      icon: 'File',
      requiresImage: true,
      minMedia: 1,
      maxMedia: 20,
    },
  ],
  youtube: [
    { 
      format: 'youtube_shorts', 
      label: 'Shorts', 
      description: 'Vídeo ≤ 60 segundos', 
      icon: 'Play',
      requiresVideo: true,
      minMedia: 1,
      maxMedia: 1,
      maxDuration: 60,
    },
    { 
      format: 'youtube_video', 
      label: 'Vídeo Longo', 
      description: 'Vídeo completo', 
      icon: 'Video',
      requiresVideo: true,
      minMedia: 1,
      maxMedia: 1,
    },
  ],
  tiktok: [
    { 
      format: 'tiktok_video', 
      label: 'Vídeo curto', 
      description: 'Vídeo vertical', 
      icon: 'Video',
      requiresVideo: true,
      minMedia: 1,
      maxMedia: 1,
      maxDuration: 600,
    },
  ],
  facebook: [
    { 
      format: 'facebook_image', 
      label: 'Post de Imagem', 
      description: 'Imagem ou múltiplas', 
      icon: 'Image',
      requiresImage: true,
      minMedia: 1,
      maxMedia: 10,
    },
    { 
      format: 'facebook_stories', 
      label: 'Stories', 
      description: 'Imagem ou vídeo', 
      icon: 'Circle',
      minMedia: 1,
      maxMedia: 1,
    },
    { 
      format: 'facebook_reel', 
      label: 'Reel', 
      description: 'Vídeo curto', 
      icon: 'Video',
      requiresVideo: true,
      minMedia: 1,
      maxMedia: 1,
      maxDuration: 90,
    },
  ],
  x: [],
};

// Helper to get network from format
export function getNetworkFromFormat(format: PostFormat): SocialNetwork {
  if (format.startsWith('instagram_')) return 'instagram';
  if (format.startsWith('linkedin_')) return 'linkedin';
  if (format.startsWith('youtube_')) return 'youtube';
  if (format.startsWith('tiktok_')) return 'tiktok';
  if (format.startsWith('facebook_')) return 'facebook';
  return 'instagram';
}

// Helper to get format config
export function getFormatConfig(format: PostFormat): PostFormatConfig | undefined {
  const network = getNetworkFromFormat(format);
  return NETWORK_POST_FORMATS[network].find(f => f.format === format);
}

export interface SocialProfile {
  id: string;
  user_id: string;
  network: SocialNetwork;
  profile_name: string;
  profile_handle?: string;
  profile_image_url?: string;
  connection_status: ConnectionStatus;
  profile_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MediaItem {
  id: string;
  url: string;
  thumbnail_url?: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  duration?: number; // seconds for video
  aspect_ratio?: string;
  alt_text?: string;
  is_cover?: boolean;
  order: number;
}

export interface NetworkValidation {
  network: SocialNetwork;
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export interface ManualPost {
  id?: string;
  user_id?: string;
  post_type: PostType;
  selected_networks: SocialNetwork[];
  selected_formats?: PostFormat[];
  media_items: MediaItem[];
  caption: string;
  caption_edited?: string;
  first_comment?: string;
  alt_texts?: Record<string, string>; // media_id -> alt_text
  utm_preset?: string;
  scheduled_date?: string;
  schedule_asap: boolean;
  status: PostStatus;
  network_validations?: Record<SocialNetwork, NetworkValidation>;
  approval_comments?: string;
  origin_mode: 'manual' | 'ia';
  created_at?: string;
  updated_at?: string;
}

export interface NetworkConstraints {
  max_caption_length: number;
  max_first_comment_length?: number;
  max_images: number;
  min_images: number;
  max_video_duration?: number; // seconds
  supported_aspect_ratios: string[];
  supports_links_in_caption: boolean;
  supports_first_comment: boolean;
  supports_carousel: boolean;
  supports_video: boolean;
  link_character_count?: number;
}
