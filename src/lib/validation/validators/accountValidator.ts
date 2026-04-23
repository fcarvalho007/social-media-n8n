import { ValidatorContext, ValidationIssue } from '../types';
import { getNetworkFromFormat, getFormatConfig } from '@/types/social';

/**
 * accountValidator
 * ----------------
 * Verifica que cada formato seleccionado tem uma rede social associada
 * conhecida. Hoje é leve (a app só permite formatos com rede definida) mas
 * fica preparado para detectar futuros casos de "formato sem conta ligada".
 *
 * O gating de presença de perfis ligados acontece no momento da publicação
 * (edge function `publish-to-getlate`), pelo que aqui apenas damos *aviso*
 * informativo se o utilizador escolher um formato sem `getNetworkFromFormat`
 * mapeado — caso contrário não emitimos issues, evitando duplicação com o
 * `formatValidator`.
 */
export async function accountValidator(
  ctx: ValidatorContext,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  for (const format of ctx.selectedFormats) {
    const network = getNetworkFromFormat(format);
    const config = getFormatConfig(format);
    const label = config?.label ?? format;

    if (!network) {
      issues.push({
        id: `account:${format}:no-network`,
        severity: 'warning',
        category: 'platform',
        format,
        title: `${label}: sem rede associada`,
        description:
          'Não foi possível determinar a rede social deste formato. Verifica em Definições → Contas Sociais que tens uma conta ligada.',
      });
    }
  }

  return issues;
}
