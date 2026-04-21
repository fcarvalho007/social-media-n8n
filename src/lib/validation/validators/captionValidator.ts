import { ValidatorContext, ValidationIssue } from '../types';
import { getNetworkFromFormat } from '@/types/social';
import { NETWORK_CONSTRAINTS, NETWORK_INFO } from '@/lib/socialNetworks';

/**
 * Validates caption length and hashtag count per network.
 * Provides auto-fixes when the caption can be safely truncated.
 */
export async function captionValidator(
  ctx: ValidatorContext,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const networks = new Set(ctx.selectedFormats.map(f => getNetworkFromFormat(f)));

  networks.forEach(network => {
    const constraints = NETWORK_CONSTRAINTS[network];
    if (!constraints) return;
    const networkLabel = NETWORK_INFO[network]?.name ?? network;

    // Caption length error
    if (ctx.caption.length > constraints.max_caption_length) {
      const overshoot = ctx.caption.length - constraints.max_caption_length;
      issues.push({
        id: `caption:${network}:over-length`,
        severity: 'error',
        category: 'caption',
        platform: network,
        title: `Legenda excede limite (${networkLabel})`,
        description: `Tens ${ctx.caption.length} caracteres — máximo ${constraints.max_caption_length}. Excedido em ${overshoot}.`,
        autoFixable: !!ctx.fixHelpers?.setCaption,
        fixLabel: `Cortar para ${constraints.max_caption_length} caracteres`,
        fixAction: () => {
          ctx.fixHelpers?.setCaption?.(
            ctx.caption.slice(0, constraints.max_caption_length),
          );
        },
      });
    }

    // Links in non-supporting platforms (warning)
    if (!constraints.supports_links_in_caption && /https?:\/\//i.test(ctx.caption)) {
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
  const hashtagsInCaption = (ctx.caption.match(/#\w+/g) || []).length;
  const totalHashtags = hashtagsInCaption + ctx.hashtags.length;
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
