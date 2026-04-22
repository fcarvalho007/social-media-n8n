import { ValidatorContext, ValidationIssue } from './types';
import { formatValidator } from './validators/formatValidator';
import { captionValidator } from './validators/captionValidator';
import { mediaAspectValidator } from './validators/mediaAspectValidator';
import { mediaResolutionValidator } from './validators/mediaResolutionValidator';
import { videoDurationValidator } from './validators/videoDurationValidator';
import { gbpValidator } from './validators/gbpValidator';
import { duplicateValidator } from './validators/duplicateValidator';

type Validator = (ctx: ValidatorContext) => Promise<ValidationIssue[]>;

const VALIDATORS: Validator[] = [
  formatValidator,
  captionValidator,
  mediaAspectValidator,
  mediaResolutionValidator,
  videoDurationValidator,
  gbpValidator,
  duplicateValidator,
];

/**
 * Runs all validators in parallel and returns a flat list of issues.
 * Individual validator failures are isolated (logged, ignored).
 */
export async function runAllValidators(
  ctx: ValidatorContext,
): Promise<ValidationIssue[]> {
  const settled = await Promise.allSettled(VALIDATORS.map(v => v(ctx)));
  const issues: ValidationIssue[] = [];

  settled.forEach((res, idx) => {
    if (res.status === 'fulfilled') {
      issues.push(...res.value);
    } else {
      console.warn(`[runAllValidators] validator #${idx} failed`, res.reason);
    }
  });

  return issues;
}

/**
 * Build a stable cache key for the current input snapshot. Used to avoid
 * re-running expensive media analysis when nothing relevant changed.
 */
export function buildValidationCacheKey(ctx: ValidatorContext): string {
  const fileSignature = ctx.mediaFiles
    .map(f => `${f.name}:${f.size}:${f.lastModified}`)
    .join('|');
  return JSON.stringify({
    formats: [...ctx.selectedFormats].sort(),
    captionLen: ctx.caption.length,
    captionHead: ctx.caption.slice(0, 100),
    hashtagsCount: ctx.hashtags.length,
    hashtagsHead: ctx.hashtags.slice(0, 10).join(','),
    asap: ctx.scheduleAsap,
    schedAt: ctx.scheduledDate?.toISOString() ?? null,
    files: fileSignature,
  });
}
