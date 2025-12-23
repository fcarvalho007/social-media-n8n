import { Instagram, Linkedin, Youtube, Facebook, Music, MapPin } from 'lucide-react';
import { SocialNetwork } from '@/types/social';
import { cn } from '@/lib/utils';

export interface PlatformConfig {
  name: string;
  shortName: string;
  icon: typeof Instagram;
  colorHex: string;
  colorClass: string;
  enabled: boolean;
}

export const PLATFORM_CONFIGS: Record<SocialNetwork, PlatformConfig> = {
  instagram: {
    name: 'Instagram',
    shortName: 'Insta',
    icon: Instagram,
    colorHex: '#E1306C',
    colorClass: 'text-[#E1306C]',
    enabled: true,
  },
  linkedin: {
    name: 'LinkedIn',
    shortName: 'LinkedIn',
    icon: Linkedin,
    colorHex: '#0A66C2',
    colorClass: 'text-[#0A66C2]',
    enabled: true,
  },
  youtube: {
    name: 'YouTube',
    shortName: 'YouTube',
    icon: Youtube,
    colorHex: '#FF0000',
    colorClass: 'text-[#FF0000]',
    enabled: true,
  },
  tiktok: {
    name: 'TikTok',
    shortName: 'TikTok',
    icon: Music,
    colorHex: '#000000',
    colorClass: 'text-foreground',
    enabled: true,
  },
  facebook: {
    name: 'Facebook',
    shortName: 'FB',
    icon: Facebook,
    colorHex: '#1877F2',
    colorClass: 'text-[#1877F2]',
    enabled: true,
  },
  x: {
    name: 'X',
    shortName: 'X',
    icon: Instagram, // placeholder
    colorHex: '#000000',
    colorClass: 'text-foreground',
    enabled: false,
  },
  googlebusiness: {
    name: 'Google Business',
    shortName: 'Google',
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
