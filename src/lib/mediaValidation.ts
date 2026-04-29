/**
 * Media Validation Utilities
 * Used to validate media aspect ratios, resolution, and duration
 */

import { PostFormat } from '@/types/social';

export interface MediaDimensions {
  width: number;
  height: number;
}

export interface MediaValidationResult {
  isValid: boolean;
  aspectRatio: {
    actual: string;
    recommended: string[];
    isIdeal: boolean;
    deviation: number; // percentage deviation from ideal
  };
  resolution: {
    width: number;
    height: number;
    isLow: boolean;
    minRecommended: { width: number; height: number };
  };
  duration?: {
    seconds: number;
    maxAllowed: number;
    isValid: boolean;
  };
  warnings: string[];
  suggestions: string[];
}

// Ideal aspect ratios for each format
export const FORMAT_ASPECT_RATIOS: Record<string, { ratios: string[]; tolerance: number }> = {
  instagram_carousel: { ratios: ['1:1', '4:5'], tolerance: 0.05 },
  instagram_image: { ratios: ['1:1', '4:5'], tolerance: 0.05 },
  instagram_reel: { ratios: ['9:16'], tolerance: 0.03 },
  instagram_stories: { ratios: ['9:16'], tolerance: 0.03 },
  instagram_story_link: { ratios: ['9:16'], tolerance: 0.03 },
  linkedin_post: { ratios: ['1:1', '4:5', '16:9', '1.91:1'], tolerance: 0.1 },
  linkedin_document: { ratios: ['1:1', '4:5', '16:9'], tolerance: 0.1 },
  youtube_shorts: { ratios: ['9:16'], tolerance: 0.03 },
  youtube_video: { ratios: ['16:9'], tolerance: 0.05 },
  tiktok_video: { ratios: ['9:16'], tolerance: 0.03 },
  facebook_image: { ratios: ['1:1', '4:5', '16:9'], tolerance: 0.1 },
  facebook_stories: { ratios: ['9:16'], tolerance: 0.03 },
  facebook_reel: { ratios: ['9:16'], tolerance: 0.03 },
};

// Minimum resolution recommendations
export const MIN_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  instagram_carousel: { width: 1080, height: 1080 },
  instagram_image: { width: 1080, height: 1080 },
  instagram_reel: { width: 1080, height: 1920 },
  instagram_stories: { width: 1080, height: 1920 },
  instagram_story_link: { width: 1080, height: 1920 },
  linkedin_post: { width: 1200, height: 627 },
  linkedin_document: { width: 1080, height: 1080 },
  youtube_shorts: { width: 1080, height: 1920 },
  youtube_video: { width: 1920, height: 1080 },
  tiktok_video: { width: 1080, height: 1920 },
  facebook_image: { width: 1200, height: 630 },
  facebook_stories: { width: 1080, height: 1920 },
  facebook_reel: { width: 1080, height: 1920 },
};

// Max video duration in seconds (per Getlate API authoritative values)
export const MAX_VIDEO_DURATION: Record<string, number> = {
  instagram_reel: 90,
  instagram_stories: 60,
  instagram_story_link: 60,
  instagram_image: 3600, // Feed video up to 60min
  youtube_shorts: 60,
  youtube_video: 900, // 15 min default (unverified). Verified up to 12h.
  tiktok_video: 600, // 10 min
  facebook_image: 14400, // Feed: 240 min
  facebook_stories: 120, // Facebook Stories: 120s per Getlate
  facebook_reel: 90,
  linkedin_post: 600, // 10 min personal (30 min company)
};

// Min video duration in seconds (some APIs reject very short clips)
export const MIN_VIDEO_DURATION: Record<string, number> = {
  tiktok_video: 3,
};

/**
 * Parse aspect ratio string to decimal
 */
export function parseAspectRatio(ratio: string): number {
  const parts = ratio.split(':');
  if (parts.length === 2) {
    return parseFloat(parts[0]) / parseFloat(parts[1]);
  }
  return parseFloat(ratio);
}

/**
 * Calculate aspect ratio from dimensions
 */
export function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const ratioW = width / divisor;
  const ratioH = height / divisor;
  
  // Simplify common ratios
  const decimal = width / height;
  
  if (Math.abs(decimal - 1) < 0.02) return '1:1';
  if (Math.abs(decimal - 0.8) < 0.02) return '4:5';
  if (Math.abs(decimal - 0.5625) < 0.02) return '9:16';
  if (Math.abs(decimal - 1.7778) < 0.02) return '16:9';
  if (Math.abs(decimal - 1.91) < 0.05) return '1.91:1';
  
  return `${ratioW}:${ratioH}`;
}

/**
 * Check if aspect ratio is within tolerance of target
 */
export function isAspectRatioValid(
  actualRatio: number,
  targetRatios: string[],
  tolerance: number
): { isValid: boolean; closest: string; deviation: number } {
  let minDeviation = Infinity;
  let closest = targetRatios[0];
  
  for (const ratio of targetRatios) {
    const target = parseAspectRatio(ratio);
    const deviation = Math.abs(actualRatio - target) / target;
    
    if (deviation < minDeviation) {
      minDeviation = deviation;
      closest = ratio;
    }
  }
  
  return {
    isValid: minDeviation <= tolerance,
    closest,
    deviation: minDeviation * 100, // as percentage
  };
}

/**
 * Get image dimensions
 */
export function getImageDimensions(file: File): Promise<MediaDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get video dimensions and duration
 */
export function getVideoDimensions(file: File): Promise<MediaDimensions & { duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => {
      reject(new Error('Failed to load video'));
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Validate a single media file for a specific format
 */
export async function validateMedia(
  file: File,
  format: PostFormat
): Promise<MediaValidationResult> {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  const isVideo = file.type.startsWith('video/');
  const formatConfig = FORMAT_ASPECT_RATIOS[format];
  const minRes = MIN_RESOLUTIONS[format];
  const maxDuration = MAX_VIDEO_DURATION[format];
  
  let dimensions: MediaDimensions;
  let duration: number | undefined;
  
  try {
    if (isVideo) {
      const videoData = await getVideoDimensions(file);
      dimensions = { width: videoData.width, height: videoData.height };
      duration = videoData.duration;
    } else {
      dimensions = await getImageDimensions(file);
    }
  } catch {
    return {
      isValid: false,
      aspectRatio: {
        actual: 'unknown',
        recommended: formatConfig?.ratios || ['1:1'],
        isIdeal: false,
        deviation: 100,
      },
      resolution: {
        width: 0,
        height: 0,
        isLow: true,
        minRecommended: minRes || { width: 1080, height: 1080 },
      },
      warnings: ['Não foi possível ler as dimensões do ficheiro'],
      suggestions: ['Tente carregar um ficheiro diferente'],
    };
  }
  
  // Calculate actual aspect ratio
  const actualRatioDecimal = dimensions.width / dimensions.height;
  const actualRatioStr = calculateAspectRatio(dimensions.width, dimensions.height);
  
  // Check aspect ratio
  const ratioCheck = formatConfig
    ? isAspectRatioValid(actualRatioDecimal, formatConfig.ratios, formatConfig.tolerance)
    : { isValid: true, closest: actualRatioStr, deviation: 0 };
  
  if (!ratioCheck.isValid) {
    warnings.push(`Proporção ${actualRatioStr} não é ideal para este formato`);
    suggestions.push(`Recomendado: ${formatConfig?.ratios.join(' ou ')}`);
  }
  
  // Check resolution
  const isLowRes = minRes
    ? dimensions.width < minRes.width * 0.8 || dimensions.height < minRes.height * 0.8
    : false;
  
  if (isLowRes) {
    warnings.push('Resolução baixa pode afetar a qualidade');
    suggestions.push(`Recomendado: mínimo ${minRes?.width}x${minRes?.height}px`);
  }
  
  // Check video duration
  let durationResult: MediaValidationResult['duration'];
  if (isVideo && duration !== undefined && maxDuration) {
    durationResult = {
      seconds: duration,
      maxAllowed: maxDuration,
      isValid: duration <= maxDuration,
    };
    
    if (!durationResult.isValid) {
      warnings.push(`Vídeo muito longo (${Math.round(duration)}s)`);
      suggestions.push(`Máximo permitido: ${maxDuration}s`);
    }
  }
  
  return {
    isValid: warnings.length === 0,
    aspectRatio: {
      actual: actualRatioStr,
      recommended: formatConfig?.ratios || ['1:1'],
      isIdeal: ratioCheck.isValid,
      deviation: ratioCheck.deviation,
    },
    resolution: {
      width: dimensions.width,
      height: dimensions.height,
      isLow: isLowRes,
      minRecommended: minRes || { width: 1080, height: 1080 },
    },
    duration: durationResult,
    warnings,
    suggestions,
  };
}

/**
 * Validate multiple media files for selected formats
 */
export async function validateMediaBatch(
  files: File[],
  formats: PostFormat[]
): Promise<Map<number, MediaValidationResult[]>> {
  const results = new Map<number, MediaValidationResult[]>();
  
  for (let i = 0; i < files.length; i++) {
    const fileResults: MediaValidationResult[] = [];
    for (const format of formats) {
      const result = await validateMedia(files[i], format);
      fileResults.push(result);
    }
    results.set(i, fileResults);
  }
  
  return results;
}

/**
 * Get overall validation summary
 */
export function getMediaValidationSummary(
  results: Map<number, MediaValidationResult[]>
): {
  hasWarnings: boolean;
  totalWarnings: number;
  criticalIssues: string[];
} {
  let totalWarnings = 0;
  const criticalIssues: string[] = [];
  
  results.forEach((fileResults, fileIndex) => {
    fileResults.forEach(result => {
      totalWarnings += result.warnings.length;
      
      // Critical issues
      if (result.duration && !result.duration.isValid) {
        criticalIssues.push(`Ficheiro ${fileIndex + 1}: vídeo muito longo`);
      }
      if (result.resolution.isLow) {
        criticalIssues.push(`Ficheiro ${fileIndex + 1}: resolução muito baixa`);
      }
    });
  });
  
  return {
    hasWarnings: totalWarnings > 0,
    totalWarnings,
    criticalIssues,
  };
}
