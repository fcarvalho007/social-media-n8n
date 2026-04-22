import { ValidatorContext, ValidationIssue } from '../types';
import { getDimensionsCached } from '../dimensionCache';

const GBP_MIN_CAPTION = 30;

/**
 * Google Business Profile specific rules:
 * - Caption must be at least 30 characters (API rejects shorter posts).
 * - Vertical 9:16 media is shown poorly on Maps; warn the user.
 */
export async function gbpValidator(
  ctx: ValidatorContext,
): Promise<ValidationIssue[]> {
  const hasGbp = ctx.selectedFormats.includes('googlebusiness_post');
  if (!hasGbp) return [];

  const issues: ValidationIssue[] = [];
  const captionLen = ctx.caption.trim().length;

  if (captionLen < GBP_MIN_CAPTION) {
    issues.push({
      id: 'gbp:caption-too-short',
      severity: 'error',
      category: 'platform',
      platform: 'googlebusiness',
      format: 'googlebusiness_post',
      title: 'Caption do Google Business demasiado curta',
      description: `O Google Business exige pelo menos ${GBP_MIN_CAPTION} caracteres. Tens ${captionLen}.`,
      autoFixable: !!ctx.fixHelpers?.focusCaption,
      fixLabel: 'Editar legenda',
      fixAction: () => ctx.fixHelpers?.focusCaption?.(),
    });
  }

  // Detect vertical 9:16 media (warning only)
  for (let i = 0; i < ctx.mediaFiles.length; i++) {
    if (ctx.signal?.aborted) break;
    const file = ctx.mediaFiles[i];
    try {
      const dims = await getDimensionsCached(file);
      const ratio = dims.width / dims.height;
      if (ratio < 0.7) {
        issues.push({
          id: `gbp:vertical-media:${i}`,
          severity: 'warning',
          category: 'platform',
          platform: 'googlebusiness',
          format: 'googlebusiness_post',
          title: 'Conteúdo vertical no Google Business',
          description:
            'O Google Business mostra melhor conteúdo horizontal (16:9) ou quadrado. Vertical 9:16 aparece cortado nos resultados de pesquisa.',
          affectedItems: [i],
        });
        break; // one warning is enough
      }
    } catch {
      // ignore
    }
  }

  return issues;
}
