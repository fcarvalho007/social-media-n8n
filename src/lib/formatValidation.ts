import { PostFormat, getFormatConfig, getNetworkFromFormat } from '@/types/social';
import { NETWORK_CONSTRAINTS } from '@/lib/socialNetworks';

/**
 * Formatos que, embora a API aceite tecnicamente 1 ficheiro (ex.: o
 * Instagram aceita um carrossel de 1), são *semanticamente* destinados a
 * múltiplos ficheiros. O fluxo de UX exige ≥2 antes de avançar para o
 * próximo passo, evitando que o utilizador caia no Step 3 com apenas 1
 * imagem quando escolheu "Carrossel" ou "Documento PDF".
 *
 * NÃO altera a validação de publicação (continua a aceitar o que o
 * formato permite — ver `validateFormat`).
 */
const MULTI_MEDIA_FORMATS = new Set<PostFormat>([
  'instagram_carousel',
  'linkedin_document',
]);

/**
 * Mínimo de média *efectivo* para o progressive disclosure.
 * Devolve `Math.max(minMedia, 2)` se algum formato seleccionado pertencer
 * à lista de "multi-media", caso contrário devolve o `minMedia` natural.
 */
export function getEffectiveMinMedia(formats: PostFormat[]): number {
  const base = getMediaRequirements(formats).minMedia || 1;
  const needsMulti = formats.some((f) => MULTI_MEDIA_FORMATS.has(f));
  return needsMulti ? Math.max(base, 2) : base;
}

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

  // Instagram carousel: warning instead of error for >10 media
  if (format === 'instagram_carousel' && totalMedia > 10) {
    warnings.push(`Instagram aceita máx. 10 imagens. A Getlate receberá ${totalMedia} - poderá ser necessário ajustar.`);
  }
  // LinkedIn Document: validate by file size instead of count
  else if (format === 'linkedin_document') {
    const totalSizeMB = mediaFiles.reduce((acc, f) => acc + f.size / (1024 * 1024), 0);
    if (totalSizeMB > 100) {
      errors.push(`PDF final não pode exceder 100MB (atual: ${totalSizeMB.toFixed(1)}MB)`);
    }
    if (totalMedia > 300) {
      errors.push(`Máximo 300 páginas permitidas`);
    }
  } else if (config.maxMedia && totalMedia > config.maxMedia) {
    errors.push(`Máximo ${config.maxMedia} ficheiro(s) permitido(s)`);
  }

  if (format === 'instagram_story_link' && imageCount > 0 && videoCount > 0) {
    errors.push('Story com Link aceita apenas uma imagem ou um vídeo');
  }

  // Video requirement
  if (config.requiresVideo && videoCount === 0) {
    errors.push('Este formato requer um vídeo');
  }

  // Image requirement - for carousel/document formats, accept either images OR videos
  // instagram_carousel and linkedin_document can have mixed media (frames extracted from videos)
  if (config.requiresImage && imageCount === 0 && videoCount === 0) {
    // Only show error if format truly requires image-only (not carousel/document which accepts both)
    if (format !== 'instagram_carousel' && format !== 'linkedin_document') {
      errors.push('Este formato requer uma imagem');
    }
  }

  // Video duration validation
  if (config.maxDuration && videoDuration && videoDuration > config.maxDuration) {
    errors.push(`Vídeo excede ${config.maxDuration} segundos`);
  }

  // Warnings
  if (!constraints.supports_links_in_caption && caption.includes('http')) {
    warnings.push(format === 'instagram_story_link' ? 'O link será usado no sticker manual, não na legenda.' : 'Links não são clicáveis nesta plataforma');
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
