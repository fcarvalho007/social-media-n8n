import type { PostFormat, SocialNetwork } from '@/types/social';
import { getNetworkFromFormat } from '@/types/social';

/**
 * Formatos onde o alt-text é efetivamente publicado.
 * Não inclui Stories, Reels, TikTok, YouTube nem Google Business
 * porque essas redes/formatos não suportam descrição alternativa
 * persistente para imagens.
 */
export const ALT_TEXT_SUPPORTED_FORMATS: ReadonlySet<PostFormat> = new Set([
  'instagram_image',
  'instagram_carousel',
  'linkedin_post',
  'linkedin_document',
  'facebook_image',
]);

/** Nome amigável (pt-PT) por rede para microtextos. */
const NETWORK_LABELS: Record<SocialNetwork, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  x: 'X',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  googlebusiness: 'Google Business',
};

/** Para o lado "Ignorado em ..." usamos rótulos mais específicos
 *  quando o utilizador escolheu um formato vertical/efémero. */
const FORMAT_LABELS: Partial<Record<PostFormat, string>> = {
  instagram_stories: 'Stories',
  instagram_story_link: 'Stories',
  instagram_reel: 'Reels',
  facebook_stories: 'Stories',
  facebook_reel: 'Reels',
  tiktok_video: 'TikTok',
  youtube_shorts: 'YouTube',
  youtube_video: 'YouTube',
  googlebusiness_post: 'Google Business',
};

interface AltTextSupportContext {
  /** Pelo menos um formato seleccionado suporta alt-text. */
  hasSupported: boolean;
  /** Pelo menos um formato seleccionado NÃO suporta alt-text. */
  hasUnsupported: boolean;
  /** Microtexto adaptativo a mostrar por baixo do campo. `null` quando todas as redes seleccionadas suportam. */
  microcopy: string | null;
}

function joinPt(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.length} redes`;
}

function uniqueSorted(items: string[]): string[] {
  return Array.from(new Set(items)).sort((a, b) => a.localeCompare(b, 'pt-PT'));
}

/**
 * Determina se o painel de alt-text deve aparecer e produz o microtexto
 * informativo adaptativo às redes/formatos seleccionados.
 *
 * Regras (decisão 1 do prompt):
 * - Mostrar o painel se ≥1 formato seleccionado suporta alt-text.
 * - Microtexto enumera redes onde será usado e onde será ignorado.
 * - Máx. 2 itens por lado; acima disso colapsa para "N redes".
 * - Se todas suportam, microtexto é `null`.
 */
export function getAltTextSupportContext(selectedFormats: PostFormat[]): AltTextSupportContext {
  if (!selectedFormats || selectedFormats.length === 0) {
    return { hasSupported: false, hasUnsupported: false, microcopy: null };
  }

  const supportedNetworks: string[] = [];
  const unsupportedLabels: string[] = [];

  for (const format of selectedFormats) {
    if (ALT_TEXT_SUPPORTED_FORMATS.has(format)) {
      // Defesa em profundidade: rede desconhecida cai no próprio formato.
      supportedNetworks.push(NETWORK_LABELS[getNetworkFromFormat(format)] ?? format);
    } else {
      // Preferir rótulo de formato (Stories/Reels) quando disponível.
      const formatLabel = FORMAT_LABELS[format];
      if (formatLabel) {
        unsupportedLabels.push(formatLabel);
      } else {
        unsupportedLabels.push(NETWORK_LABELS[getNetworkFromFormat(format)] ?? format);
      }
    }
  }

  const supportedUnique = uniqueSorted(supportedNetworks);
  const unsupportedUnique = uniqueSorted(unsupportedLabels);

  const hasSupported = supportedUnique.length > 0;
  const hasUnsupported = unsupportedUnique.length > 0;

  if (!hasSupported) {
    return { hasSupported: false, hasUnsupported, microcopy: null };
  }

  // Todas as redes suportam → não mostrar microtexto.
  if (!hasUnsupported) {
    return { hasSupported: true, hasUnsupported: false, microcopy: null };
  }

  const usedIn = `Usado em ${joinPt(supportedUnique)}`;
  const ignoredIn = `Ignorado em ${joinPt(unsupportedUnique)}`;
  return { hasSupported: true, hasUnsupported: true, microcopy: `${usedIn}. ${ignoredIn}.` };
}
