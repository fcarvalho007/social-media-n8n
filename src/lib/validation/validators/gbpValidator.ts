import { ValidatorContext, ValidationIssue } from '../types';
import { getDimensionsCached } from '../dimensionCache';

const GBP_MIN_CAPTION = 30;
const GBP_MAX_IMAGE_MB = 5;
const GBP_MIN_WIDTH = 400;
const GBP_MIN_HEIGHT = 300;

/**
 * Google Business Profile rules (Getlate API authoritative):
 * - Caption ≥ 30 chars (API rejects shorter posts).
 * - Video is NOT supported by GBP API — block hard.
 * - Image max 5MB (block) and min dimensions 400×300 (block).
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

  // Block video: GBP API does not support it
  const videoIndices = ctx.mediaFiles
    .map((f, i) => (f.type.startsWith('video/') ? i : -1))
    .filter(i => i >= 0);

  if (videoIndices.length > 0) {
    issues.push({
      id: `gbp:video-unsupported:${videoIndices.join(',')}`,
      severity: 'error',
      category: 'platform',
      platform: 'googlebusiness',
      format: 'googlebusiness_post',
      title: 'Google Business não suporta vídeo',
      description:
        'A API do Google Business Profile aceita apenas imagens. Remove o vídeo ou desmarca o Google Business.',
      affectedItems: videoIndices,
    });
  }

  // Validate image size and dimensions
  for (let i = 0; i < ctx.mediaFiles.length; i++) {
    if (ctx.signal?.aborted) break;
    const file = ctx.mediaFiles[i];
    if (!file.type.startsWith('image/')) continue;

    // Size check
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > GBP_MAX_IMAGE_MB) {
      issues.push({
        id: `gbp:image-too-large:${i}`,
        severity: 'error',
        category: 'platform',
        platform: 'googlebusiness',
        format: 'googlebusiness_post',
        title: 'Imagem excede 5MB para o Google Business',
        description: `Ficheiro ${i + 1} tem ${sizeMb.toFixed(1)}MB. Comprime para ≤ ${GBP_MAX_IMAGE_MB}MB antes de publicar.`,
        affectedItems: [i],
      });
    }

    // Dimensions check
    try {
      const dims = await getDimensionsCached(file);
      if (dims.width < GBP_MIN_WIDTH || dims.height < GBP_MIN_HEIGHT) {
        issues.push({
          id: `gbp:image-too-small:${i}`,
          severity: 'error',
          category: 'platform',
          platform: 'googlebusiness',
          format: 'googlebusiness_post',
          title: 'Imagem abaixo das dimensões mínimas',
          description: `O Google Business exige no mínimo ${GBP_MIN_WIDTH}×${GBP_MIN_HEIGHT}px. Ficheiro ${i + 1}: ${dims.width}×${dims.height}px.`,
          affectedItems: [i],
        });
      }

      // Vertical orientation warning (only if not already blocked)
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
      }
    } catch {
      // ignore unreadable files
    }
  }

  return issues;
}
