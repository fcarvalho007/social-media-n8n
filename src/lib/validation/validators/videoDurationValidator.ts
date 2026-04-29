import { ValidatorContext, ValidationIssue } from '../types';
import { getNetworkFromFormat, getFormatConfig } from '@/types/social';
import { MAX_VIDEO_DURATION, MIN_VIDEO_DURATION, getVideoDimensions } from '@/lib/mediaValidation';

/**
 * Detects videos exceeding the per-format max duration or below the min
 * required by the platform API. Errors block publish.
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
    const platform = getNetworkFromFormat(format);
    const label = getFormatConfig(format)?.label ?? format;

    // ---- Max duration check ----
    const max = MAX_VIDEO_DURATION[format];
    if (max) {
      const offenders: number[] = [];
      durations.forEach((dur, idx) => {
        if (dur > max) offenders.push(idx);
      });

      if (offenders.length > 0) {
        const isStories = format.endsWith('_stories');
        const description = isStories
          ? `${offenders.length} vídeo(s) acima do limite de ${max}s. O Meta divide automaticamente vídeos longos em segmentos — encurta para ≤${max}s para publicar como segmento único.`
          : format === 'youtube_video'
            ? `${offenders.length} vídeo(s) acima de ${Math.round(max / 60)} min. Canais YouTube não verificados estão limitados a 15 min — verifica o canal por telemóvel para desbloquear vídeos longos.`
            : `${offenders.length} vídeo(s) acima do limite de ${max}s. Apara o vídeo num editor externo antes de publicar.`;

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
    }

    // ---- Min duration check (TikTok ≥3s) ----
    const min = MIN_VIDEO_DURATION[format];
    if (min) {
      const tooShort: number[] = [];
      durations.forEach((dur, idx) => {
        if (dur < min) tooShort.push(idx);
      });

      if (tooShort.length > 0) {
        issues.push({
          id: `media:video-duration-min:${format}:${tooShort.join(',')}`,
          severity: 'error',
          category: 'media',
          platform,
          format,
          title: `Vídeo demasiado curto para ${label}`,
          description: `${tooShort.length} vídeo(s) abaixo do mínimo de ${min}s exigido pela API do ${platform}. Estende o vídeo antes de publicar.`,
          affectedItems: tooShort,
        });
      }
    }
  });

  return issues;
}
