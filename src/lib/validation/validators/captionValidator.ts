import { ValidatorContext, ValidationIssue } from '../types';
import { getNetworkFromFormat } from '@/types/social';
import { NETWORK_CONSTRAINTS, NETWORK_INFO } from '@/lib/socialNetworks';

function getCaptionForNetwork(ctx: ValidatorContext, network: string): string {
  if (ctx.useSeparateCaptions && Object.prototype.hasOwnProperty.call(ctx.networkCaptions ?? {}, network)) {
    return ctx.networkCaptions?.[network] ?? '';
  }
  return ctx.caption;
}

/**
 * Validates caption length and hashtag count per network.
 * Provides auto-fixes when the caption can be safely truncated.
 */
export async function captionValidator(
  ctx: ValidatorContext,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const networks = new Set(ctx.selectedFormats.map(f => getNetworkFromFormat(f)));

  // LinkedIn requires a caption — even minimal — to publish successfully.
  const linkedinCaption = getCaptionForNetwork(ctx, 'linkedin');
  if (networks.has('linkedin') && !linkedinCaption.trim()) {
    issues.push({
      id: 'caption:linkedin:empty',
      severity: 'error',
      category: 'caption',
      platform: 'linkedin',
      title: 'Legenda obrigatória para o LinkedIn',
      description: 'O LinkedIn não aceita publicações sem texto. Escreve pelo menos uma frase.',
      autoFixable: !!ctx.fixHelpers?.focusCaption,
      fixLabel: 'Editar legenda',
      fixAction: () => ctx.fixHelpers?.focusCaption?.('linkedin'),
    });
  }

  networks.forEach(network => {
    const constraints = NETWORK_CONSTRAINTS[network];
    if (!constraints) return;
    const networkLabel = NETWORK_INFO[network]?.name ?? network;
    const networkCaption = getCaptionForNetwork(ctx, network);

    // Caption length error
    if (networkCaption.length > constraints.max_caption_length) {
      const overshoot = networkCaption.length - constraints.max_caption_length;
      issues.push({
        id: `caption:${network}:over-length`,
        severity: 'error',
        category: 'caption',
        platform: network,
        title: `Legenda excede limite (${networkLabel})`,
        description: `Tens ${networkCaption.length} caracteres — máximo ${constraints.max_caption_length}. Excedido em ${overshoot}.`,
        autoFixable: !!ctx.fixHelpers?.focusCaption,
        fixLabel: 'Editar legenda',
        fixAction: () => ctx.fixHelpers?.focusCaption?.(network),
      });
    }

    // Links in non-supporting platforms (warning)
    if (!constraints.supports_links_in_caption && /https?:\/\//i.test(networkCaption)) {
      issues.push({
        id: `caption:${network}:links-not-clickable`,
        severity: 'warning',
        category: 'caption',
        platform: network,
        title: `Links não clicáveis no ${networkLabel}`,
        description: 'Considera mover o link para a bio ou primeiro comentário.',
      });
    }
  });

  // Hashtag count (Instagram limit of 30)
  const instagramCaption = getCaptionForNetwork(ctx, 'instagram');
  const hashtagsInCaption = instagramCaption.match(/#\w+/g) || [];
  const totalHashtags = new Set([
    ...ctx.hashtags.map(tag => tag.replace(/^#/, '').toLowerCase()),
    ...hashtagsInCaption.map(tag => tag.replace(/^#/, '').toLowerCase()),
  ]).size;
  const hasInstagram = networks.has('instagram');

  if (hasInstagram && totalHashtags > 30) {
    issues.push({
      id: 'caption:instagram:too-many-hashtags',
      severity: 'warning',
      category: 'caption',
      platform: 'instagram',
      title: 'Mais de 30 hashtags no Instagram',
      description: `Tens ${totalHashtags} hashtags. O Instagram só processa as primeiras 30 e excedê-las pode reduzir o alcance.`,
      autoFixable: !!ctx.fixHelpers?.setHashtags && ctx.hashtags.length > 30,
      fixLabel: 'Manter apenas as primeiras 30',
      fixAction: () => {
        ctx.fixHelpers?.setHashtags?.(ctx.hashtags.slice(0, 30));
      },
    });
  }

  return issues;
}
