import { Instagram, Linkedin, Youtube, Facebook, MapPin, type LucideIcon } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import type { SocialNetwork } from '@/types/social';
import { TikTokIcon } from '@/components/icons/TikTokIcon';

/**
 * Mapa central de ícones e cores oficiais por rede social.
 *
 * Cor Instagram: `#E4405F` (cor oficial do logótipo). Aplicada também em
 * `platformConfig.tsx`, `PublishSuccessModal` e `PublishProgressModal`
 * para coerência cromática em todo o app.
 *
 * Ícone TikTok: SVG inline em `src/components/icons/TikTokIcon.tsx`
 * (logótipo da marca). Lucide não tem TikTok e o brief proíbe novas
 * dependências.
 */
export interface NetworkIconConfig {
  /**
   * Componente do ícone. Aceita `LucideIcon` (Lucide) ou qualquer
   * `ComponentType` que renderize um `<svg>` (ex.: `TikTokIcon`).
   */
  icon: LucideIcon | ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number | string }>;
  color: string;
  label: string;
}

export const NETWORK_ICONS: Record<SocialNetwork, NetworkIconConfig> = {
  instagram: { icon: Instagram, color: '#E4405F', label: 'Instagram' },
  linkedin: { icon: Linkedin, color: '#0A66C2', label: 'LinkedIn' },
  youtube: { icon: Youtube, color: '#FF0000', label: 'YouTube' },
  tiktok: { icon: TikTokIcon, color: '#000000', label: 'TikTok' },
  facebook: { icon: Facebook, color: '#1877F2', label: 'Facebook' },
  googlebusiness: { icon: MapPin, color: '#4285F4', label: 'Google Business' },
  // X ainda não está activo no fluxo manual; reservado para evitar undefined.
  x: { icon: Instagram, color: '#000000', label: 'X' },
};

export function getNetworkIcon(network: SocialNetwork): NetworkIconConfig {
  return NETWORK_ICONS[network];
}
