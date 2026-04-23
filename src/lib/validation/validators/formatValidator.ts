import { ValidatorContext, ValidationIssue } from '../types';
import { validateAllFormats } from '@/lib/formatValidation';
import { getNetworkFromFormat, getFormatConfig } from '@/types/social';

const CAPTION_VALIDATION_MESSAGES = [
  'Legenda excede',
  'Links não são clicáveis',
  'Muitas hashtags',
];

/**
 * Wraps the legacy `validateAllFormats` (count, requiresVideo/Image, PDF size...)
 * into the unified ValidationIssue model. Errors block publication.
 */
export async function formatValidator(
  ctx: ValidatorContext,
): Promise<ValidationIssue[]> {
  if (ctx.selectedFormats.length === 0) {
    return [
      {
        id: 'format:no-format-selected',
        severity: 'error',
        category: 'format',
        title: 'Nenhum formato selecionado',
        description: 'Escolhe pelo menos um formato no Passo 1 para continuar.',
      },
    ];
  }

  const results = validateAllFormats(ctx.selectedFormats, ctx.caption, ctx.mediaFiles);
  const issues: ValidationIssue[] = [];

  for (const [format, result] of Object.entries(results)) {
    const platform = getNetworkFromFormat(format as any);
    const config = getFormatConfig(format as any);
    const label = config?.label ?? format;

    result.errors
      .filter((msg) => !CAPTION_VALIDATION_MESSAGES.some((captionMsg) => msg.startsWith(captionMsg)))
      .forEach((msg, idx) => {
      issues.push({
        id: `format:${format}:err:${idx}:${msg.slice(0, 24)}`,
        severity: 'error',
        category: 'format',
        platform,
        format: format as any,
        title: `${label}: requisito em falta`,
        description: msg,
      });
    });

    result.warnings
      .filter((msg) => !CAPTION_VALIDATION_MESSAGES.some((captionMsg) => msg.startsWith(captionMsg)))
      .forEach((msg, idx) => {
      issues.push({
        id: `format:${format}:warn:${idx}:${msg.slice(0, 24)}`,
        severity: 'warning',
        category: 'format',
        platform,
        format: format as any,
        title: `${label}: aviso`,
        description: msg,
      });
    });
  }

  return issues;
}
