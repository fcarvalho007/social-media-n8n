import { ValidatorContext, ValidationIssue } from '../types';
import { validateFormat } from '@/lib/formatValidation';
import { getNetworkFromFormat, getFormatConfig, PostFormat } from '@/types/social';

const CAPTION_VALIDATION_MESSAGES = [
  'Legenda excede',
  'Links não são clicáveis',
  'Muitas hashtags',
];

function getEffectiveCaption(ctx: ValidatorContext, format: PostFormat) {
  const network = getNetworkFromFormat(format);
  if (ctx.useSeparateCaptions && Object.prototype.hasOwnProperty.call(ctx.networkCaptions ?? {}, network)) {
    return ctx.networkCaptions?.[network] ?? '';
  }
  return ctx.caption;
}

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

  const issues: ValidationIssue[] = [];

  for (const format of ctx.selectedFormats) {
    const effectiveCaption = getEffectiveCaption(ctx, format);
    const result = validateFormat(format, effectiveCaption, ctx.mediaFiles);
    const platform = getNetworkFromFormat(format);
    const config = getFormatConfig(format);
    const label = config?.label ?? format;

    if (format === 'instagram_story_link') {
      issues.push({
        id: 'format:instagram_story_link:manual-flow-info',
        severity: 'info',
        category: 'format',
        platform,
        format,
        title: 'Publicação semi-automática',
        description: 'A app prepara a Story e agenda um lembrete; o link sticker é aplicado manualmente no Instagram.',
        dismissable: true,
      });
    }

    result.errors
      .filter((msg) => !CAPTION_VALIDATION_MESSAGES.some((captionMsg) => msg.startsWith(captionMsg)))
      .forEach((msg, idx) => {
      issues.push({
        id: `format:${format}:err:${idx}:${msg.slice(0, 24)}`,
        severity: 'error',
        category: 'format',
        platform,
        format,
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
        format,
        title: `${label}: aviso`,
        description: msg,
      });
    });
  }

  return issues;
}
