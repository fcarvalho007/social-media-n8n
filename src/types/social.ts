export type SocialNetwork = 'instagram' | 'linkedin' | 'facebook' | 'x' | 'tiktok' | 'youtube';
export type PostType = 'image' | 'video' | 'carousel' | 'text';
export type PostStatus = 'draft' | 'waiting_for_approval' | 'pending' | 'approved' | 'scheduled' | 'published' | 'rejected' | 'failed';
export type ConnectionStatus = 'connected' | 'expired' | 'missing_permission';

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
