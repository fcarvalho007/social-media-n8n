import { ValidatorContext, ValidationIssue } from '../types';
import { getNetworkFromFormat } from '@/types/social';
import {
  analyzeFilesForInstagram,
  resizeForInstagram,
} from '@/lib/canvas/instagramResize';

/**
 * Detects images outside Instagram's 0.8–1.91 aspect range and offers a
 * one-click auto-resize using letterbox/pillarbox margins.
 */
export async function mediaAspectValidator(
  ctx: ValidatorContext,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const networks = new Set(ctx.selectedFormats.map(f => getNetworkFromFormat(f)));
  if (!networks.has('instagram')) return issues;

  const images = ctx.mediaFiles.filter(f => f.type.startsWith('image/'));
  if (images.length === 0) return issues;

  if (ctx.signal?.aborted) return issues;

  let analysis;
  try {
    analysis = await analyzeFilesForInstagram(images);
  } catch (err) {
    console.warn('[mediaAspectValidator] analysis failed', err);
    return issues;
  }

  if (analysis.needsResize.length === 0) return issues;

  // Map back from filtered images to indices in ctx.mediaFiles
  const affectedIndices: number[] = [];
  ctx.mediaFiles.forEach((file, idx) => {
    if (analysis.needsResize.some(f => f.name === file.name && f.size === file.size)) {
      affectedIndices.push(idx);
    }
  });

  issues.push({
    id: `media:instagram:aspect:${affectedIndices.join(',')}`,
    severity: 'warning',
    category: 'media',
    platform: 'instagram',
    title: `${analysis.needsResize.length} imagem(s) fora do rácio Instagram`,
    description:
      'O Instagram aceita rácios entre 4:5 e 1.91:1. Posso adicionar margens automáticas (letterbox/pillarbox) sem cortar conteúdo.',
    affectedItems: affectedIndices,
    autoFixable: !!ctx.fixHelpers?.setMediaFiles,
    fixLabel: `Ajustar ${analysis.needsResize.length} imagem(s) automaticamente`,
    fixAction: async () => {
      if (!ctx.fixHelpers?.setMediaFiles) return;
      const resized = await Promise.all(
        ctx.mediaFiles.map(async file => {
          if (!file.type.startsWith('image/')) return file;
          const needs = analysis.needsResize.some(
            f => f.name === file.name && f.size === file.size,
          );
          if (!needs) return file;
          try {
            const result = await resizeForInstagram(file);
            return result.file;
          } catch (err) {
            console.warn('[mediaAspectValidator] resize failed for', file.name, err);
            return file;
          }
        }),
      );
      ctx.fixHelpers.setMediaFiles(resized);
    },
  });

  return issues;
}
