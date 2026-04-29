import { ValidatorContext, ValidationIssue } from '../types';
import { getNetworkFromFormat, getFormatConfig } from '@/types/social';
import { MAX_VIDEO_DURATION, getVideoDimensions } from '@/lib/mediaValidation';

/**
 * Detects videos exceeding the per-format max duration. Errors block publish.
 */
export async function videoDurationValidator(
  ctx: ValidatorContext,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const videoFiles = ctx.mediaFiles
    .map((f, idx) => ({ file: f, idx }))
    .filter(item => item.file.type.startsWith('video/'));

  if (videoFiles.length === 0) return issues;

  // Read all video durations once
  const durations = new Map<number, number>();
  for (const { file, idx } of videoFiles) {
    if (ctx.signal?.aborted) return issues;
    try {
      const meta = await getVideoDimensions(file);
      durations.set(idx, meta.duration);
    } catch {
      // ignored
    }
  }

  ctx.selectedFormats.forEach(format => {
    const max = MAX_VIDEO_DURATION[format];
    if (!max) return;
    const platform = getNetworkFromFormat(format);
    const label = getFormatConfig(format)?.label ?? format;

    const offenders: number[] = [];
    durations.forEach((dur, idx) => {
      if (dur > max) offenders.push(idx);
    });

    if (offenders.length > 0) {
      const isStories = format.endsWith('_stories');
      const description = isStories
        ? `${offenders.length} vídeo(s) acima do limite de ${max}s. O Meta divide automaticamente vídeos longos em segmentos — encurta para ≤${max}s para publicar como segmento único.`
        : `${offenders.length} vídeo(s) acima do limite. Aparas o vídeo num editor externo antes de publicar.`;

      issues.push({
        id: `media:video-duration:${format}:${offenders.join(',')}`,
        severity: 'error',
        category: 'media',
        platform,
        format,
        title: `Vídeo excede ${max}s para ${label}`,
        description,
        affectedItems: offenders,
      });
    }
  });

  return issues;
}
