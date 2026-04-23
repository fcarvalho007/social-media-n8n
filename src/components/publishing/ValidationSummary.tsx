import { AlertTriangle, XCircle, CheckCircle2, Instagram, Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ValidationResult } from '@/lib/publishingValidation';
import type { PublishTarget } from '@/types/publishing';

interface ValidationSummaryProps {
  validations: Partial<Record<PublishTarget, ValidationResult>>;
  publishTargets: Record<PublishTarget, boolean>;
  className?: string;
}

const PLATFORM_META: Record<PublishTarget, { label: string; Icon: typeof Instagram }> = {
  instagram: { label: 'Instagram', Icon: Instagram },
  linkedin: { label: 'LinkedIn', Icon: Linkedin },
};

/**
 * Lista compacta dos erros e avisos activos por plataforma.
 * Exibida acima do ActionBar para que o utilizador veja exactamente
 * o que tem de corrigir antes de aprovar.
 */
export const ValidationSummary = ({ validations, publishTargets, className }: ValidationSummaryProps) => {
  const activePlatforms = (Object.keys(publishTargets) as PublishTarget[]).filter(
    (p) => publishTargets[p]
  );

  const items = activePlatforms.flatMap((platform) => {
    const v = validations[platform];
    if (!v) return [];
    const errors = (v.errors || []).map((msg) => ({ platform, severity: 'error' as const, msg }));
    const warnings = (v.warnings || []).map((msg) => ({ platform, severity: 'warning' as const, msg }));
    return [...errors, ...warnings];
  });

  if (activePlatforms.length === 0) return null;

  // Tudo OK
  if (items.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-success flex items-center gap-2',
          className
        )}
        role="status"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="font-medium">Pronto a publicar</span>
        <span className="text-success/80">— sem erros nas plataformas selecionadas</span>
      </div>
    );
  }

  return (
    <div
      className={cn('rounded-lg border bg-card px-3 py-2.5 space-y-1.5', className)}
      role="alert"
      aria-live="polite"
    >
      <p className="text-xs font-semibold text-foreground">
        {items.filter((i) => i.severity === 'error').length > 0
          ? 'Corrige antes de aprovar'
          : 'Avisos antes de aprovar'}
      </p>
      <ul className="space-y-1">
        {items.map((item, idx) => {
          const { Icon, label } = PLATFORM_META[item.platform];
          const isError = item.severity === 'error';
          return (
            <li
              key={`${item.platform}-${idx}`}
              className={cn(
                'flex items-start gap-2 text-xs leading-snug',
                isError ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
              )}
            >
              {isError ? (
                <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              )}
              <Icon className="h-3 w-3 mt-1 shrink-0 opacity-70" />
              <span>
                <span className="font-medium">{label}:</span> {item.msg}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/**
 * Devolve a primeira mensagem de erro entre as plataformas activas (se houver).
 * Útil para `disabledReason` do botão Aprovar.
 */
export function getFirstErrorMessage(
  validations: Partial<Record<PublishTarget, ValidationResult>>,
  publishTargets: Record<PublishTarget, boolean>
): string | undefined {
  for (const platform of Object.keys(publishTargets) as PublishTarget[]) {
    if (!publishTargets[platform]) continue;
    const v = validations[platform];
    const firstError = v?.errors?.[0];
    if (firstError) {
      const label = PLATFORM_META[platform]?.label ?? platform;
      return `${label}: ${firstError}`;
    }
  }
  return undefined;
}
