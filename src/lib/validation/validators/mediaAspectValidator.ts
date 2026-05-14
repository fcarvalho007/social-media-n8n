import { ValidatorContext, ValidationIssue } from '../types';
import { getNetworkFromFormat } from '@/types/social';
import {
  analyzeFilesForInstagram,
  resizeForInstagram,
} from '@/lib/canvas/instagramResize';

const getVideoRatio = (file: File) => new Promise<number | null>((resolve) => {
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);
  video.preload = 'metadata';
  video.onloadedmetadata = () => {
    URL.revokeObjectURL(url);
    resolve(video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : null);
  };
  video.onerror = () => {
    URL.revokeObjectURL(url);
    resolve(null);
  };
  video.src = url;
});

/**
 * Format-aware aspect ratio validator for Instagram:
 * - instagram_reel / instagram_stories / instagram_story_link → 9:16 estrito (warning, sem auto-fix)
 * - instagram_image / instagram_carousel → intervalo 0.75–1.91 com auto-fix letterbox/pillarbox
 */
export async function mediaAspectValidator(
  ctx: ValidatorContext,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const networks = new Set(ctx.selectedFormats.map(f => getNetworkFromFormat(f)));
  if (!networks.has('instagram')) return issues;

  const VERTICAL_FORMATS: string[] = ['instagram_reel', 'instagram_stories', 'instagram_story_link'];
  const verticalFormatSelected = ctx.selectedFormats.find(f => VERTICAL_FORMATS.includes(f));
  const feedFormatSelected = ctx.selectedFormats.some(
    f => f === 'instagram_image' || f === 'instagram_carousel',
  );

  const images = ctx.mediaFiles.filter(f => f.type.startsWith('image/'));
  const videos = ctx.mediaFiles.filter(f => f.type.startsWith('video/'));
  if (images.length === 0 && videos.length === 0) return issues;

  if (ctx.signal?.aborted) return issues;

  let analysis = { needsResize: [] as File[], analysis: new Map<string, { originalRatio: number }>() };
  try {
    if (images.length > 0) analysis = await analyzeFilesForInstagram(images);
  } catch (err) {
    console.warn('[mediaAspectValidator] analysis failed', err);
    return issues;
  }

  // ─── Vertical formats (Reel / Stories / Story Link): 9:16 estrito ───
  if (verticalFormatSelected) {
    const TARGET = 9 / 16; // 0.5625
    const TOLERANCE = 0.02;
    const nonVerticalImages = images.filter((file) => {
      const item = analysis.analysis.get(file.name);
      return item ? Math.abs(item.originalRatio - TARGET) > TOLERANCE : false;
    });
    const videoRatios = await Promise.all(
      videos.map(async file => ({ file, ratio: await getVideoRatio(file) })),
    );
    const nonVerticalVideos = videoRatios
      .filter(item => item.ratio !== null && Math.abs(item.ratio - TARGET) > TOLERANCE)
      .map(item => item.file);
    const affected = [...nonVerticalImages, ...nonVerticalVideos];

    if (affected.length > 0) {
      const formatLabel =
        verticalFormatSelected === 'instagram_reel' ? 'Reel'
        : verticalFormatSelected === 'instagram_stories' ? 'Story'
        : 'Story com Link';
      issues.push({
        id: `media:${verticalFormatSelected}:aspect:${affected.map(f => f.name).join(',')}`,
        severity: 'warning',
        category: 'media',
        platform: 'instagram',
        format: verticalFormatSelected as any,
        title: `${formatLabel} fora do rácio 9:16`,
        description:
          'O Instagram exige 9:16 (1080×1920) para este formato. A média será cortada/escalada automaticamente. Para controlo total, sobe um ficheiro vertical 9:16.',
      });
    }

    // Se só há formato vertical seleccionado, não corre o bloco de feed
    if (!feedFormatSelected) return issues;
  }

  // ─── Feed formats (image / carousel): 0.75 – 1.91 com auto-fix ───
  if (!feedFormatSelected || analysis.needsResize.length === 0) return issues;

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
      'O Instagram aceita rácios entre 3:4 e 1.91:1. Posso adicionar margens automáticas (letterbox/pillarbox) sem cortar conteúdo.',
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
