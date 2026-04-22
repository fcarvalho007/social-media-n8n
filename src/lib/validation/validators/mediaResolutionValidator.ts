import { ValidatorContext, ValidationIssue } from '../types';
import { getNetworkFromFormat, getFormatConfig } from '@/types/social';
import { MIN_RESOLUTIONS } from '@/lib/mediaValidation';
import { getDimensionsCached } from '../dimensionCache';

/**
 * Flags media whose resolution is below 80% of the format's recommended
 * minimum. Does not block publication — visible quality warning only.
 */
export async function mediaResolutionValidator(
  ctx: ValidatorContext,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  if (ctx.mediaFiles.length === 0 || ctx.selectedFormats.length === 0) return issues;

  // Most demanding minimum across selected formats
  const minWidth = Math.max(
    ...ctx.selectedFormats.map(f => MIN_RESOLUTIONS[f]?.width ?? 0),
  );
  const minHeight = Math.max(
    ...ctx.selectedFormats.map(f => MIN_RESOLUTIONS[f]?.height ?? 0),
  );
  if (!minWidth || !minHeight) return issues;

  const wThreshold = minWidth * 0.8;
  const hThreshold = minHeight * 0.8;
  const lowResIndices: number[] = [];

  for (let i = 0; i < ctx.mediaFiles.length; i++) {
    if (ctx.signal?.aborted) return issues;
    const file = ctx.mediaFiles[i];
    try {
      const dims = await getDimensionsCached(file);
      if (dims.width < wThreshold || dims.height < hThreshold) {
        lowResIndices.push(i);
      }
    } catch {
      // Ignore — other validators may already report unreadable files.
    }
  }

  if (lowResIndices.length === 0) return issues;

  // Pick the first selected format as the "reference" platform for the chip
  const refFormat = ctx.selectedFormats[0];
  const platform = getNetworkFromFormat(refFormat);
  const formatLabel = getFormatConfig(refFormat)?.label ?? refFormat;

  issues.push({
    id: `media:resolution:${lowResIndices.join(',')}`,
    severity: 'warning',
    category: 'media',
    platform,
    title: `${lowResIndices.length} ficheiro(s) com resolução baixa`,
    description: `Recomendado mínimo ${minWidth}×${minHeight}px (${formatLabel}). Resoluções inferiores podem aparecer pixelizadas.`,
    affectedItems: lowResIndices,
  });

  return issues;
}
