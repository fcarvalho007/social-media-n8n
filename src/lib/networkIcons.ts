import { Instagram, Linkedin, Youtube, Facebook, Music2, MapPin, type LucideIcon } from 'lucide-react';
import type { SocialNetwork } from '@/types/social';

/**
 * Mapa central de ícones e cores oficiais por rede social.
 *
 * Decisão de cor Instagram: mantemos `#E1306C` por consistência com
 * `PublishSuccessModal`, `PublishProgressModal` e `platformConfig.tsx`
 * já existentes no projeto. Trocar para `#E4405F` introduziria divergência
 * cromática em três ficheiros não tocados neste prompt.
 *
 * Decisão de ícone TikTok: o pacote `@icons-pack/react-simple-icons` não está
 * instalado e o brief proibe adicionar dependências novas só para isto, pelo
 * que se usa `Music2` (Lucide) — placeholder semanticamente próximo do
 * universo audio/música do TikTok.
 */
export interface NetworkIconConfig {
  icon: LucideIcon;
  color: string;
  label: string;
}

export const NETWORK_ICONS: Record<SocialNetwork, NetworkIconConfig> = {
  instagram: { icon: Instagram, color: '#E1306C', label: 'Instagram' },
  linkedin: { icon: Linkedin, color: '#0A66C2', label: 'LinkedIn' },
  youtube: { icon: Youtube, color: '#FF0000', label: 'YouTube' },
  tiktok: { icon: Music2, color: '#000000', label: 'TikTok' },
  facebook: { icon: Facebook, color: '#1877F2', label: 'Facebook' },
  googlebusiness: { icon: MapPin, color: '#4285F4', label: 'Google Business' },
  // X ainda não está activo no fluxo manual; reservado para evitar undefined.
  x: { icon: Instagram, color: '#000000', label: 'X' },
};

export function getNetworkIcon(network: SocialNetwork): NetworkIconConfig {
  return NETWORK_ICONS[network];
}
