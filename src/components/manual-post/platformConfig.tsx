import { Instagram, Linkedin, Youtube, Facebook, Music, MapPin } from 'lucide-react';
import { SocialNetwork } from '@/types/social';
import { cn } from '@/lib/utils';

export interface PlatformConfig {
  name: string;
  icon: typeof Instagram;
  colorHex: string;
  colorClass: string;
  enabled: boolean;
}

export const PLATFORM_CONFIGS: Record<SocialNetwork, PlatformConfig> = {
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    colorHex: '#E1306C',
    colorClass: 'text-[#E1306C]',
    enabled: true,
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    colorHex: '#0A66C2',
    colorClass: 'text-[#0A66C2]',
    enabled: true,
  },
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    colorHex: '#FF0000',
    colorClass: 'text-[#FF0000]',
    enabled: true,
  },
  tiktok: {
    name: 'TikTok',
    icon: Music,
    colorHex: '#000000',
    colorClass: 'text-foreground',
    enabled: true,
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    colorHex: '#1877F2',
    colorClass: 'text-[#1877F2]',
    enabled: true,
  },
  x: {
    name: 'X',
    icon: Instagram, // placeholder
    colorHex: '#000000',
    colorClass: 'text-foreground',
    enabled: false,
  },
  googlebusiness: {
    name: 'Google Business',
    icon: MapPin,
    colorHex: '#4285F4',
    colorClass: 'text-[#4285F4]',
    enabled: true,
  },
};

export function getPlatformConfig(platform: SocialNetwork): PlatformConfig {
  return PLATFORM_CONFIGS[platform];
}

interface PlatformIconProps {
  platform: SocialNetwork;
  className?: string;
  colored?: boolean;
}

export function PlatformIcon({ platform, className, colored = false }: PlatformIconProps) {
  const config = PLATFORM_CONFIGS[platform];
  const Icon = config.icon;
  
  return (
    <Icon 
      className={cn(
        className,
        colored && config.colorClass
      )} 
    />
  );
}
