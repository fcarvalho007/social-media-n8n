import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  Copy,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  classifyErrorFromString,
  getErrorInfoFromStructured,
  getRetryGuidance,
  getCopyableErrorReport,
  getSourceLabel,
  type StructuredError,
  type ErrorInfo,
} from '@/lib/publishingErrors';

export interface ErrorExplanationCardProps {
  /** Raw error string (from error_log) — usado se structuredError não vier */
  errorString?: string | null;
  /** HTTP status code, opcional */
  httpStatus?: number;
  /** Erro estruturado já classificado (preferir este se existir) */
  structuredError?: StructuredError | null;
  /** Contexto extra para o relatório de cópia */
  context?: {
    postId?: string;
    platform?: string;
  };
  /** Callbacks opcionais para CTAs */
  onRetry?: () => void;
  onAutoFixCaption?: () => void;
  onOpenAccountSettings?: () => void;
  /** Layout compacto (lista de cards) ou expandido (modal/página) */
  variant?: 'compact' | 'full';
  /** Esconde o título grande (útil quando o card já está dentro de outro container) */
  hideTitle?: boolean;
  className?: string;
}

const SEVERITY_STYLES = {
  info: {
    border: 'border-l-4 border-l-blue-500 border border-blue-500/20',
    bg: 'bg-blue-500/5',
    iconWrap: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    Icon: Info,
    label: 'Informação',
  },
  warning: {
    border: 'border-l-4 border-l-amber-500 border border-amber-500/20',
    bg: 'bg-amber-500/5',
    iconWrap: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    Icon: AlertTriangle,
    label: 'Aviso',
  },
  critical: {
    border: 'border-l-4 border-l-destructive border border-destructive/30',
    bg: 'bg-destructive/5',
    iconWrap: 'bg-destructive/15 text-destructive',
    badge: 'bg-destructive/15 text-destructive border-destructive/30',
    Icon: AlertCircle,
    label: 'Erro crítico',
  },
} as const;

export function ErrorExplanationCard({
  errorString,
  httpStatus,
  structuredError: structuredErrorProp,
  context,
  onRetry,
  onAutoFixCaption,
  onOpenAccountSettings,
  variant = 'full',
  hideTitle = false,
  className,
}: ErrorExplanationCardProps) {
  const [showTechnical, setShowTechnical] = useState(false);

  // Resolve structured error: prefer prop, else classify from string
  const structuredError: StructuredError =
    structuredErrorProp ||
    classifyErrorFromString(errorString || 'Erro desconhecido', httpStatus);

  const errorInfo: ErrorInfo = getErrorInfoFromStructured(structuredError);
  const styles = SEVERITY_STYLES[errorInfo.severity];
  const SeverityIcon = styles.Icon;
  const sourceInfo = getSourceLabel(structuredError.source);
  const retryText = getRetryGuidance(errorInfo.whenToRetry);

  const showAccountCTA =
    structuredError.code === 'ACCOUNT_ERROR' || structuredError.code === 'TOKEN_EXPIRED';
  const showAutoFixCTA = structuredError.code === 'DUPLICATE_CONTENT' && onAutoFixCaption;
  const showRetryCTA = errorInfo.isRetryable && onRetry;

  const handleCopyReport = async () => {
    const report = getCopyableErrorReport(structuredError, {
      postId: context?.postId,
      platform: context?.platform,
      rawError: errorString || undefined,
    });
    try {
      await navigator.clipboard.writeText(report);
      toast.success('Relatório copiado', {
        description: 'Cola no email para o suporte',
      });
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  // Compact variant: title + plainExplanation (1ª linha) + botão "Ver detalhes"
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'rounded-md p-3 text-sm',
          styles.border,
          styles.bg,
          className
        )}
      >
        <div className="flex items-start gap-2">
          <SeverityIcon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', styles.iconWrap.split(' ').slice(-2).join(' '))} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground leading-snug">
              {errorInfo.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {errorInfo.plainExplanation}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden',
        styles.border,
        styles.bg,
        className
      )}
    >
      {/* Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className={cn('rounded-full p-2 flex-shrink-0', styles.iconWrap)}>
            <SeverityIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn('text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded border', styles.badge)}>
                {styles.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {sourceInfo.emoji} {sourceInfo.label}
              </span>
              {context?.platform && (
                <span className="text-[10px] text-muted-foreground">
                  · {context.platform}
                </span>
              )}
            </div>
            {!hideTitle && (
              <h3 className="text-base sm:text-lg font-semibold text-foreground leading-tight">
                {errorInfo.title}
              </h3>
            )}
          </div>
        </div>

        {/* Why */}
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-1">
              Porquê?
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {errorInfo.plainExplanation}
            </p>
          </div>

          {/* What to do */}
          {errorInfo.whatToDo.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">
                O que fazer
              </p>
              <ul className="space-y-1.5">
                {errorInfo.whatToDo.map((step, i) => (
                  <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                    <span className="text-primary font-medium flex-shrink-0">{i + 1}.</span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* When to retry */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{retryText}</span>
          </div>
        </div>

        {/* CTAs */}
        {(showRetryCTA || showAutoFixCTA || showAccountCTA) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {showRetryCTA && (
              <Button onClick={onRetry} size="sm" className="gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                Tentar novamente
              </Button>
            )}
            {showAutoFixCTA && (
              <Button onClick={onAutoFixCaption} size="sm" variant="secondary" className="gap-2">
                ✨ Adicionar variação subtil
              </Button>
            )}
            {showAccountCTA && (
              <Button
                onClick={onOpenAccountSettings || (() => window.open('https://getlate.dev/accounts', '_blank'))}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Reconectar conta
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Technical details (collapsible) */}
      <Collapsible open={showTechnical} onOpenChange={setShowTechnical}>
        <div className="border-t border-border/40 bg-background/40">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 px-4 sm:px-5 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                {showTechnical ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Detalhes técnicos (para suporte)
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyReport();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    handleCopyReport();
                  }
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <Copy className="h-3 w-3" />
                Copiar para suporte
              </span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 sm:px-5 pb-4 pt-1 space-y-1.5">
              <div className="text-[11px] font-mono bg-muted/40 rounded p-2.5 space-y-1 text-foreground/80 break-all">
                <div><span className="text-muted-foreground">Código:</span> {structuredError.code}</div>
                <div><span className="text-muted-foreground">Origem:</span> {sourceInfo.label}</div>
                {context?.postId && (
                  <div><span className="text-muted-foreground">Post ID:</span> {context.postId.slice(0, 12)}…</div>
                )}
                {(structuredError.originalError || errorString) && (
                  <div className="pt-1 border-t border-border/40">
                    <span className="text-muted-foreground">Erro técnico:</span>{' '}
                    <span className="whitespace-pre-wrap">{structuredError.originalError || errorString}</span>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
