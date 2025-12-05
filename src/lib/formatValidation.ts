import { PostFormat, getFormatConfig, getNetworkFromFormat } from '@/types/social';
import { NETWORK_CONSTRAINTS } from '@/lib/socialNetworks';

export interface FormatValidationResult {
  format: PostFormat;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MediaRequirements {
  requiresVideo: boolean;
  requiresImage: boolean;
  minMedia: number;
  maxMedia: number;
  maxDuration?: number;
  maxCaptionLength: number;
}

export function getMediaRequirements(formats: PostFormat[]): MediaRequirements {
  let requiresVideo = false;
  let requiresImage = false;
  let minMedia = 0;
  let maxMedia = Infinity;
  let maxDuration: number | undefined;
  let maxCaptionLength = Infinity;

  formats.forEach(format => {
    const config = getFormatConfig(format);
    const network = getNetworkFromFormat(format);
    const constraints = NETWORK_CONSTRAINTS[network];
    
    if (config) {
      if (config.requiresVideo) requiresVideo = true;
      if (config.requiresImage) requiresImage = true;
      if (config.minMedia !== undefined) minMedia = Math.max(minMedia, config.minMedia);
      if (config.maxMedia !== undefined) maxMedia = Math.min(maxMedia, config.maxMedia);
      if (config.maxDuration !== undefined) {
        maxDuration = maxDuration ? Math.min(maxDuration, config.maxDuration) : config.maxDuration;
      }
    }
    
    if (constraints) {
      maxCaptionLength = Math.min(maxCaptionLength, constraints.max_caption_length);
    }
  });

  return {
    requiresVideo,
    requiresImage,
    minMedia,
    maxMedia: maxMedia === Infinity ? 10 : maxMedia,
    maxDuration,
    maxCaptionLength: maxCaptionLength === Infinity ? 2200 : maxCaptionLength,
  };
}

export function validateFormat(
  format: PostFormat,
  caption: string,
  mediaFiles: File[],
  videoDuration?: number
): FormatValidationResult {
  const config = getFormatConfig(format);
  const network = getNetworkFromFormat(format);
  const constraints = NETWORK_CONSTRAINTS[network];
  
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config) {
    errors.push('Formato não reconhecido');
    return { format, valid: false, errors, warnings };
  }

  // Caption length validation
  if (caption.length > constraints.max_caption_length) {
    errors.push(`Legenda excede ${constraints.max_caption_length} caracteres`);
  }

  // Media count validation
  const imageCount = mediaFiles.filter(f => f.type.startsWith('image/')).length;
  const videoCount = mediaFiles.filter(f => f.type.startsWith('video/')).length;
  const totalMedia = imageCount + videoCount;

  if (config.minMedia && totalMedia < config.minMedia) {
    errors.push(`Mínimo ${config.minMedia} ficheiro(s) necessário(s)`);
  }

  if (config.maxMedia && totalMedia > config.maxMedia) {
    errors.push(`Máximo ${config.maxMedia} ficheiro(s) permitido(s)`);
  }

  // Video requirement
  if (config.requiresVideo && videoCount === 0) {
    errors.push('Este formato requer um vídeo');
  }

  // Image requirement
  if (config.requiresImage && imageCount === 0 && videoCount === 0) {
    errors.push('Este formato requer uma imagem');
  }

  // Video duration validation
  if (config.maxDuration && videoDuration && videoDuration > config.maxDuration) {
    errors.push(`Vídeo excede ${config.maxDuration} segundos`);
  }

  // Warnings
  if (!constraints.supports_links_in_caption && caption.includes('http')) {
    warnings.push('Links não são clicáveis nesta plataforma');
  }

  // Hashtag warning
  const hashtagCount = (caption.match(/#/g) || []).length;
  if (hashtagCount > 30) {
    warnings.push('Muitas hashtags podem reduzir o alcance');
  }

  return {
    format,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateAllFormats(
  formats: PostFormat[],
  caption: string,
  mediaFiles: File[],
  videoDuration?: number
): Record<PostFormat, FormatValidationResult> {
  const results: Record<string, FormatValidationResult> = {};

  formats.forEach(format => {
    results[format] = validateFormat(format, caption, mediaFiles, videoDuration);
  });

  return results as Record<PostFormat, FormatValidationResult>;
}

export function getValidationSummary(
  validations: Record<PostFormat, FormatValidationResult>
): { hasErrors: boolean; totalErrors: number; totalWarnings: number; allErrors: string[]; allWarnings: string[] } {
  let totalErrors = 0;
  let totalWarnings = 0;
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  Object.values(validations).forEach(v => {
    totalErrors += v.errors.length;
    totalWarnings += v.warnings.length;
    allErrors.push(...v.errors);
    allWarnings.push(...v.warnings);
  });

  return {
    hasErrors: totalErrors > 0,
    totalErrors,
    totalWarnings,
    allErrors: [...new Set(allErrors)], // Remove duplicates
    allWarnings: [...new Set(allWarnings)],
  };
}
