import { PublishTarget, PostType, PLATFORM_CONSTRAINTS } from '@/types/publishing';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePublishing(
  target: PublishTarget,
  postType: PostType,
  data: {
    caption?: string;
    body?: string;
    hashtags: string[];
    mediaCount: number;
    videoDuration?: number;
    videoSizeMB?: number;
  }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (target === 'instagram') {
    const constraints = PLATFORM_CONSTRAINTS.instagram;

    // Caption validation
    const captionLength = data.caption?.length || 0;
    if (captionLength > constraints.caption.maxLength) {
      errors.push(`Caption excede limite de ${constraints.caption.maxLength} caracteres. Atualmente: ${captionLength}`);
    }

    // Hashtags validation
    if (data.hashtags.length > constraints.hashtags.maxCount) {
      errors.push(`Número de hashtags excede limite de ${constraints.hashtags.maxCount}. Atualmente: ${data.hashtags.length}`);
    }

    // Carousel validation
    if (postType === 'carousel') {
      if (data.mediaCount < constraints.carousel.minImages) {
        errors.push(`Carrossel IG exige ${constraints.carousel.minImages}-${constraints.carousel.maxImages} imagens. Atualmente: ${data.mediaCount}`);
      }
      if (data.mediaCount > constraints.carousel.maxImages) {
        errors.push(`Carrossel IG exige ${constraints.carousel.minImages}-${constraints.carousel.maxImages} imagens. Atualmente: ${data.mediaCount}`);
      }
    }

    // Video validation
    if (postType === 'video') {
      if (data.videoDuration && data.videoDuration < constraints.video.minDuration) {
        errors.push(`Vídeo deve ter pelo menos ${constraints.video.minDuration}s`);
      }
      if (data.videoDuration && data.videoDuration > constraints.video.maxDuration) {
        errors.push(`Vídeo não pode exceder ${constraints.video.maxDuration}s`);
      }
      if (data.videoSizeMB && data.videoSizeMB > constraints.video.maxSizeMB) {
        errors.push(`Vídeo excede ${constraints.video.maxSizeMB}MB`);
      }
    }

    // Warnings
    if (data.hashtags.length > 20) {
      warnings.push('Mais de 20 hashtags pode reduzir o alcance');
    }
  }

  if (target === 'linkedin') {
    const constraints = PLATFORM_CONSTRAINTS.linkedin;

    // Body validation
    const bodyLength = data.body?.length || 0;
    if (bodyLength > constraints.body.maxLength) {
      errors.push(`Texto excede limite de ${constraints.body.maxLength} caracteres. Atualmente: ${bodyLength}`);
    }

    // Carousel validation (LinkedIn uses PDF documents)
    if (postType === 'carousel') {
      if (data.mediaCount < constraints.carousel.minImages) {
        errors.push(`Documento LinkedIn exige pelo menos ${constraints.carousel.minImages} página. Atualmente: ${data.mediaCount}`);
      }
      if (data.mediaCount > constraints.carousel.maxImages) {
        errors.push(`Documento LinkedIn excede limite de ${constraints.carousel.maxImages} páginas. Atualmente: ${data.mediaCount}`);
      }
    }

    // Video validation
    if (postType === 'video' && data.videoDuration) {
      if (data.videoDuration > constraints.video.maxDurationMin * 60) {
        errors.push(`Vídeo não pode exceder ${constraints.video.maxDurationMin} minutos`);
      }
    }

    // Warnings
    if (data.hashtags.length > constraints.hashtags.recommendedCount) {
      warnings.push(`Recomendado até ${constraints.hashtags.recommendedCount} hashtags para melhor alcance`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateAllTargets(
  targets: Record<PublishTarget, boolean>,
  postType: PostType,
  data: {
    caption?: string;
    body?: string;
    hashtags: string[];
    mediaCount: number;
    videoDuration?: number;
    videoSizeMB?: number;
  }
): Record<PublishTarget, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  Object.entries(targets).forEach(([target, enabled]) => {
    if (enabled) {
      results[target] = validatePublishing(target as PublishTarget, postType, data);
    }
  });

  return results as Record<PublishTarget, ValidationResult>;
}
