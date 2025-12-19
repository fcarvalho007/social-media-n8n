import { SocialNetwork, NetworkConstraints } from '@/types/social';
import { Instagram, Linkedin, Facebook, Twitter, Music, Youtube, MapPin } from 'lucide-react';

export const NETWORK_CONSTRAINTS: Record<SocialNetwork, NetworkConstraints> = {
  instagram: {
    max_caption_length: 2200,
    max_first_comment_length: 2200,
    max_images: 10,
    min_images: 1,
    max_video_duration: 60,
    supported_aspect_ratios: ['1:1', '4:5', '9:16', '16:9'],
    supports_links_in_caption: false,
    supports_first_comment: true,
    supports_carousel: true,
    supports_video: true,
  },
  linkedin: {
    max_caption_length: 3000,
    max_images: 9,
    min_images: 1,
    max_video_duration: 600, // 10 minutes
    supported_aspect_ratios: ['1:1', '16:9', '4:5'],
    supports_links_in_caption: true,
    supports_first_comment: false,
    supports_carousel: true,
    supports_video: true,
  },
  facebook: {
    max_caption_length: 63206,
    max_images: 10,
    min_images: 1,
    max_video_duration: 240 * 60, // 240 minutes
    supported_aspect_ratios: ['1:1', '16:9', '4:5', '9:16'],
    supports_links_in_caption: true,
    supports_first_comment: false,
    supports_carousel: true,
    supports_video: true,
  },
  x: {
    max_caption_length: 280,
    max_first_comment_length: 280,
    max_images: 4,
    min_images: 1,
    max_video_duration: 140,
    supported_aspect_ratios: ['1:1', '16:9', '4:5'],
    supports_links_in_caption: true,
    supports_first_comment: true,
    supports_carousel: true,
    supports_video: true,
    link_character_count: 23,
  },
  tiktok: {
    max_caption_length: 300,
    max_images: 35,
    min_images: 0,
    max_video_duration: 600, // 10 minutes
    supported_aspect_ratios: ['9:16'],
    supports_links_in_caption: false,
    supports_first_comment: false,
    supports_carousel: true,
    supports_video: true,
  },
  youtube: {
    max_caption_length: 5000,
    max_images: 0,
    min_images: 0,
    max_video_duration: 60,
    supported_aspect_ratios: ['9:16'],
    supports_links_in_caption: true,
    supports_first_comment: false,
    supports_carousel: false,
    supports_video: true,
  },
  googlebusiness: {
    max_caption_length: 1500,
    max_images: 1,
    min_images: 0,
    max_video_duration: 30,
    supported_aspect_ratios: ['1:1', '4:3', '16:9'],
    supports_links_in_caption: true,
    supports_first_comment: false,
    supports_carousel: false,
    supports_video: true,
  },
};

export const NETWORK_INFO: Record<SocialNetwork, { 
  name: string; 
  icon: any; 
  color: string;
  bgColor: string;
}> = {
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'hsl(330 80% 50%)',
    bgColor: 'hsl(330 80% 97%)',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'hsl(205 100% 42%)',
    bgColor: 'hsl(205 100% 97%)',
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'hsl(220 89% 54%)',
    bgColor: 'hsl(220 89% 97%)',
  },
  x: {
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'hsl(0 0% 0%)',
    bgColor: 'hsl(0 0% 96%)',
  },
  tiktok: {
    name: 'TikTok',
    icon: Music,
    color: 'hsl(348 91% 55%)',
    bgColor: 'hsl(348 91% 97%)',
  },
  youtube: {
    name: 'YouTube Shorts',
    icon: Youtube,
    color: 'hsl(0 100% 50%)',
    bgColor: 'hsl(0 100% 97%)',
  },
  googlebusiness: {
    name: 'Google Business',
    icon: MapPin,
    color: 'hsl(217 89% 61%)',
    bgColor: 'hsl(217 89% 97%)',
  },
};

export function validatePost(
  caption: string,
  firstComment: string | undefined,
  mediaItems: any[],
  networks: SocialNetwork[]
): Record<SocialNetwork, { network: SocialNetwork; valid: boolean; warnings: string[]; errors: string[] }> {
  const results: Record<string, any> = {};

  networks.forEach(network => {
    const constraints = NETWORK_CONSTRAINTS[network];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Caption length
    if (caption.length > constraints.max_caption_length) {
      errors.push(`Legenda excede ${constraints.max_caption_length} caracteres.`);
    }

    // Recommended caption length
    if (network === 'linkedin' && caption.length > 1500) {
      warnings.push('Considere manter a legenda abaixo de 1.500 caracteres para melhor engagement.');
    }

    // Links in caption
    if (!constraints.supports_links_in_caption && caption.includes('http')) {
      warnings.push('Links não são clicáveis em legendas nesta rede.');
    }

    // First comment
    if (firstComment) {
      if (!constraints.supports_first_comment) {
        warnings.push('Primeiro comentário não é suportado nesta rede.');
      } else if (constraints.max_first_comment_length && firstComment.length > constraints.max_first_comment_length) {
        errors.push(`Primeiro comentário excede ${constraints.max_first_comment_length} caracteres.`);
      }
    }

    // Media count
    const imageCount = mediaItems.filter(m => m.type === 'image').length;
    const videoCount = mediaItems.filter(m => m.type === 'video').length;

    if (imageCount + videoCount === 0 && network !== 'x' && network !== 'linkedin') {
      errors.push('É necessário pelo menos um item de média.');
    }

    if (imageCount > constraints.max_images) {
      errors.push(`Máximo de ${constraints.max_images} imagens permitidas.`);
    }

    // Video duration
    if (videoCount > 0 && constraints.max_video_duration) {
      mediaItems.filter(m => m.type === 'video').forEach(video => {
        if (video.duration && video.duration > constraints.max_video_duration!) {
          errors.push(`Duração do vídeo excede ${constraints.max_video_duration} segundos.`);
        }
      });
    }

    // Alt text recommendation
    const missingAltText = mediaItems.filter(m => m.type === 'image' && !m.alt_text).length;
    if (missingAltText > 0) {
      warnings.push(`${missingAltText} imagem${missingAltText > 1 ? 'ns' : ''} sem texto alternativo.`);
    }

    // Hashtags
    const hashtagCount = (caption.match(/#/g) || []).length;
    if (hashtagCount > 30) {
      warnings.push('Hashtags excessivas podem reduzir o engagement.');
    }

    results[network] = {
      network,
      valid: errors.length === 0,
      warnings,
      errors,
    };
  });

  return results;
}

export function getCharacterCount(text: string, network: SocialNetwork): number {
  const constraints = NETWORK_CONSTRAINTS[network];
  
  if (network === 'x' && constraints.link_character_count) {
    // Count URLs as fixed length on X
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    let count = text.length;
    
    urls.forEach(url => {
      count = count - url.length + constraints.link_character_count!;
    });
    
    return count;
  }
  
  return text.length;
}
