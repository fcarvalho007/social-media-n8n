import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ValidationCategory, ValidationSummary } from '@/lib/validation/types';
import { NETWORK_INFO } from '@/lib/socialNetworks';
import { ValidationIssueCard } from './ValidationIssueCard';

const CATEGORY_LABELS: Record<ValidationCategory, string> = {
  format: 'Formato',
  media: 'Média',
  caption: 'Legenda',
  platform: 'Rede',
  schedule: 'Agendamento',
  duplicate: 'Duplicados',
};

// Surface errors first, info last — matches the user's mental urgency model.
const CATEGORY_ORDER: ValidationCategory[] = [
  'format',
  'platform',
  'caption',
  'media',
  'schedule',
  'duplicate',
];

interface Props {
  validation: ValidationSummary;
  mediaFiles: File[];
  /** Optional: render in mobile bottom-sheet mode. */
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * Smart pre-validation panel.
 *
 * Desktop: collapsible card sticky inside the right column.
 * Mobile: rendered as a bottom sheet driven by `mobileOpen`.
 */
export function ValidationSidebar({
  validation,
  mediaFiles,
  mobileOpen,
  onMobileOpenChange,
  className,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const {
    issues,
    errorCount,
    warningCount,
    infoCount,
    isValidating,
    isClean,
    fix,
    dismiss,
  } = validation;

  // Generate object URLs for media thumbnails (revoked on unmount/file change)
  const thumbnails = useMemo(() => {
    const map: Record<number, string> = {};
    mediaFiles.forEach((file, idx) => {
      if (file.type.startsWith('image/')) {
        map[idx] = URL.createObjectURL(file);
      }
    });
    return map;
  }, [mediaFiles]);

  // Track which indices are videos so the IssueCard can show a video icon.
  const videoIndices = useMemo(() => {
    const set = new Set<number>();
    mediaFiles.forEach((file, idx) => {
      if (file.type.startsWith('video/')) set.add(idx);
    });
    return set;
  }, [mediaFiles]);

  useEffect(() => {
    return () => {
      Object.values(thumbnails).forEach(url => URL.revokeObjectURL(url));
    };
  }, [thumbnails]);

  // Auto-collapse when clean after 5s (only desktop)
  useEffect(() => {
    if (!isClean) return;
    const t = setTimeout(() => setCollapsed(true), 5000);
    return () => clearTimeout(t);
  }, [isClean]);

  // Re-expand when new issues appear
  useEffect(() => {
    if (errorCount + warningCount + infoCount > 0) setCollapsed(false);
  }, [errorCount, warningCount, infoCount]);

  const headerTone =
    errorCount > 0
      ? 'bg-destructive/10 border-destructive/40 text-destructive'
      : warningCount > 0
      ? 'bg-warning/10 border-warning/40 text-warning'
      : 'bg-success/10 border-success/40 text-success';

  const headerTitle = errorCount > 0
    ? `Corrige ${errorCount} ${errorCount === 1 ? 'problema' : 'problemas'} para publicar`
    : warningCount > 0
    ? `${warningCount} ${warningCount === 1 ? 'aviso' : 'avisos'} a rever`
    : isClean
    ? 'Tudo verificado · pronto a publicar'
    : isValidating
    ? 'A validar...'
    : 'Sem problemas detetados';

  const HeaderIcon = errorCount > 0
    ? AlertCircle
    : isClean
    ? CheckCircle2
    : ShieldCheck;

  const platformChips = useMemo(() => {
    const platforms = Object.keys(validation.byPlatform) as Array<
      keyof typeof NETWORK_INFO
    >;
    return platforms.map(p => ({
      key: p,
      info: NETWORK_INFO[p],
      count: validation.byPlatform[p]?.length ?? 0,
    }));
  }, [validation.byPlatform]);

  const body = (
    <div className="manual-field-stack">
      {isClean && (
        <div className="rounded-lg border border-success/30 bg-success/5 p-3 flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <p className="font-medium text-success">Tudo verificado</p>
            <p className="text-muted-foreground">
              Formato, média, legenda e regras das redes — tudo conforme.
              {platformChips.length > 0 && (
                <>
                  {' '}Pronto para{' '}
                  {platformChips.map((p, i) => (
                    <span key={p.key}>
                      <span style={{ color: p.info.color }}>{p.info.name}</span>
                      {i < platformChips.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                  .
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div className="space-y-3">
          {CATEGORY_ORDER.map(cat => {
            const list = validation.byCategory[cat];
            if (!list || list.length === 0) return null;
            return (
              <div key={cat} className="manual-field-stack">
                <h4 className="manual-microcopy px-0.5 font-semibold uppercase tracking-normal">
                  {CATEGORY_LABELS[cat]} · {list.length}
                </h4>
                <div className="space-y-2">
                  {list.map(issue => (
                    <ValidationIssueCard
                      key={issue.id}
                      issue={issue}
                      onFix={fix}
                      onDismiss={dismiss}
                      mediaThumbnails={thumbnails}
                      videoIndices={videoIndices}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isValidating && issues.length === 0 && !isClean && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground p-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          A analisar legenda e média...
        </div>
      )}
    </div>
  );

  // ── Mobile (Bottom Sheet) ───────────────────────────────────────────────
  if (typeof mobileOpen === 'boolean') {
    // Wraps `fix` so the mobile sheet closes (with haptic feedback) right
    // after the user taps "Corrigir" — keeps focus on the underlying field.
    const handleMobileFix = (issueId: string) => {
      try {
        navigator.vibrate?.(10);
      } catch {
        // Some browsers (Safari iOS) reject vibrate(); ignore silently.
      }
      fix(issueId);
      onMobileOpenChange?.(false);
    };

    const mobileBody = (
      <div className="manual-field-stack">
        {isClean && (
          <div className="rounded-lg border border-success/30 bg-success/5 p-3 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
            <div className="text-xs space-y-1">
              <p className="font-medium text-success">Tudo verificado</p>
              <p className="text-muted-foreground">
                Formato, média, legenda e regras das redes — tudo conforme.
              </p>
            </div>
          </div>
        )}
        {issues.length > 0 && (
          <div className="space-y-3">
            {CATEGORY_ORDER.map(cat => {
              const list = validation.byCategory[cat];
              if (!list || list.length === 0) return null;
              return (
                <div key={cat} className="manual-field-stack">
                  <h4 className="manual-microcopy px-0.5 font-semibold uppercase tracking-normal">
                    {CATEGORY_LABELS[cat]} · {list.length}
                  </h4>
                  <div className="space-y-2">
                    {list.map(issue => (
                      <ValidationIssueCard
                        key={issue.id}
                        issue={issue}
                        onFix={handleMobileFix}
                        onDismiss={dismiss}
                        mediaThumbnails={thumbnails}
                        videoIndices={videoIndices}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {isValidating && issues.length === 0 && !isClean && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            A analisar legenda e média...
          </div>
        )}
      </div>
    );

    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="bottom" className="max-h-[80vh] flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <HeaderIcon className="h-4 w-4" />
              {headerTitle}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 mt-3 pr-3">
            {mobileBody}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  // ── Desktop (Collapsible Card) ──────────────────────────────────────────
  return (
    <Card className={cn('overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className={cn(
          'w-full flex items-center gap-2.5 px-4 py-2.5 border-b transition-colors',
          headerTone,
        )}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expandir validações' : 'Colapsar validações'}
      >
        {isValidating ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          <HeaderIcon className="h-4 w-4 shrink-0" />
        )}
        <span className="text-sm font-medium flex-1 text-left">
          {headerTitle}
        </span>
        <div className="flex items-center gap-1.5">
          {errorCount > 0 && (
            <Badge variant="destructive" className="manual-chip h-5 px-1.5">
              {errorCount} erro{errorCount > 1 ? 's' : ''}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge
              className="manual-chip h-5 bg-warning/20 px-1.5 text-warning hover:bg-warning/30"
            >
              {warningCount} aviso{warningCount > 1 ? 's' : ''}
            </Badge>
          )}
          {infoCount > 0 && (
            <Badge variant="secondary" className="manual-chip h-5 px-1.5">
              {infoCount} info
            </Badge>
          )}
          {collapsed ? (
            <ChevronDown className="h-4 w-4 opacity-60" />
          ) : (
            <ChevronUp className="h-4 w-4 opacity-60" />
          )}
        </div>
      </button>
      {!collapsed && (
        <CardContent className="pt-3 pb-3 max-h-[60vh] overflow-y-auto">
          {body}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Compact pill that opens the mobile sheet. Renders only on small screens.
 */
export function ValidationMobileBadge({
  validation,
  onClick,
}: {
  validation: ValidationSummary;
  onClick: () => void;
}) {
  const { errorCount, warningCount, infoCount, isClean, isValidating } = validation;
  const total = errorCount + warningCount + infoCount;

  if (isClean) {
    return (
      <button
        type="button"
        onClick={onClick}
          className="inline-flex items-center gap-1.5 rounded bg-success/15 px-2.5 py-1 text-xs font-medium text-success"
      >
        <CheckCircle2 className="h-3 w-3" />
        Tudo verificado
      </button>
    );
  }

  if (isValidating && total === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-muted px-2.5 py-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        A validar...
      </span>
    );
  }

  if (total === 0) return null;

  const tone = errorCount > 0
    ? 'bg-destructive/15 text-destructive'
    : warningCount > 0
    ? 'bg-warning/15 text-warning'
    : 'bg-primary/15 text-primary';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium',
        tone,
      )}
    >
      <AlertCircle className="h-3 w-3" />
      {errorCount > 0
        ? `${errorCount} ${errorCount === 1 ? 'erro' : 'erros'}`
        : warningCount > 0
        ? `${warningCount} ${warningCount === 1 ? 'aviso' : 'avisos'}`
        : `${infoCount} info`}
      <span className="opacity-60">· toca para ver</span>
    </button>
  );
}
