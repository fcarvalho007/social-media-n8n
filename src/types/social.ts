export type SocialNetwork = 'instagram' | 'linkedin' | 'facebook' | 'x' | 'tiktok' | 'youtube' | 'googlebusiness';
export type PostType = 'image' | 'video' | 'carousel' | 'text';
export type PostStatus = 'draft' | 'waiting_for_approval' | 'pending' | 'approved' | 'scheduled' | 'published' | 'rejected' | 'failed';
export type ConnectionStatus = 'connected' | 'expired' | 'missing_permission';

// Post format types for each network
export type PostFormat = 
  // Instagram
  | 'instagram_carousel'
  | 'instagram_image'
  | 'instagram_stories'
  | 'instagram_story_link'
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
  | 'facebook_reel'
  // Google Business
  | 'googlebusiness_post';

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
      description: '1-50 imagens (API IG máx. 10)', 
      icon: 'LayoutGrid',
      minMedia: 1,
      maxMedia: 50,
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
      description: 'Imagem ou vídeo vertical até 60s', 
      icon: 'Circle',
      minMedia: 1,
      maxMedia: 1,
      maxDuration: 60,
    },
    {
      format: 'instagram_story_link',
      label: 'Story com Link',
      description: 'Story vertical até 60s com link sticker',
      icon: 'Link',
      minMedia: 1,
      maxMedia: 1,
      maxDuration: 60,
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
      description: 'Carrossel PDF (até 300 páginas, máx. 100MB)', 
      icon: 'File',
      minMedia: 1,
      maxMedia: 300,
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
      description: 'Vídeo completo (canal não verificado: máx. 15 min)', 
      icon: 'Video',
      requiresVideo: true,
      minMedia: 1,
      maxMedia: 1,
      maxDuration: 900, // 15min default (unverified). Verified channels up to 12h.
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
      description: 'Imagem ou vídeo vertical até 2 min', 
      icon: 'Circle',
      minMedia: 1,
      maxMedia: 1,
      maxDuration: 120, // Facebook Stories: 120s per Getlate API
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
  googlebusiness: [
    { 
      format: 'googlebusiness_post', 
      label: 'Post', 
      description: 'Apenas imagem (5MB, mín. 400×300) — vídeo não suportado', 
      icon: 'MapPin',
      requiresImage: true,
      minMedia: 0,
      maxMedia: 1,
      // No maxDuration — Google Business API does not support video.
    },
  ],
};

// Helper to get network from format
export function getNetworkFromFormat(format: PostFormat): SocialNetwork {
  if (format.startsWith('instagram_')) return 'instagram';
  if (format.startsWith('linkedin_')) return 'linkedin';
  if (format.startsWith('youtube_')) return 'youtube';
  if (format.startsWith('tiktok_')) return 'tiktok';
  if (format.startsWith('facebook_')) return 'facebook';
  if (format.startsWith('googlebusiness_')) return 'googlebusiness';
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
  min_video_duration?: number; // seconds (TikTok requires ≥3s)
  supported_aspect_ratios: string[];
  supports_links_in_caption: boolean;
  supports_first_comment: boolean;
  supports_carousel: boolean;
  supports_video: boolean;
  link_character_count?: number;
  // Per-platform media limits (Getlate API authoritative values)
  max_image_size_mb?: number; // Single image size limit
  min_image_dimensions?: { width: number; height: number };
  max_title_length?: number; // YouTube title
  max_thumbnail_size_mb?: number; // YouTube thumbnail
  max_video_duration_company?: number; // LinkedIn company page videos
  max_video_duration_verified?: number; // YouTube verified channels
  max_caption_length_video?: number; // TikTok: 2.200 video vs 4.000 photo
  // LinkedIn Document specific limits
  max_pdf_size_mb?: number; // Final PDF size limit
  max_pdf_pages?: number; // Maximum pages in PDF
}
