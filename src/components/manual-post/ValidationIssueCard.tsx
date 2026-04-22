import { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, Loader2, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ValidationIssue,
  ValidationSeverity,
} from '@/lib/validation/types';
import { NETWORK_INFO } from '@/lib/socialNetworks';

const SEVERITY_CONFIG: Record<
  ValidationSeverity,
  { icon: typeof AlertCircle; tone: string; ring: string; label: string }
> = {
  error: {
    icon: AlertCircle,
    tone: 'bg-destructive/10 text-destructive',
    ring: 'border-destructive/30',
    label: 'Erro',
  },
  warning: {
    icon: AlertTriangle,
    tone: 'bg-warning/10 text-warning',
    ring: 'border-warning/30',
    label: 'Aviso',
  },
  info: {
    icon: Info,
    tone: 'bg-primary/10 text-primary',
    ring: 'border-primary/30',
    label: 'Info',
  },
};

interface Props {
  issue: ValidationIssue;
  onFix?: (id: string) => Promise<void>;
  onDismiss?: (id: string) => void;
  mediaThumbnails?: Record<number, string>;
  /** Index → true when the underlying file is a video (renders an icon). */
  videoIndices?: Set<number>;
}

export function ValidationIssueCard({
  issue,
  onFix,
  onDismiss,
  mediaThumbnails,
  videoIndices,
}: Props) {
  const [busy, setBusy] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity];
  const Icon = cfg.icon;
  const networkInfo = issue.platform ? NETWORK_INFO[issue.platform] : null;
  const NetworkIcon = networkInfo?.icon;

  const handleFix = async () => {
    if (!onFix) return;
    setBusy(true);
    try {
      await onFix(issue.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2 transition-colors',
        cfg.ring,
        'bg-card/50',
      )}
      role={issue.severity === 'error' ? 'alert' : 'status'}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
            cfg.tone,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {networkInfo && NetworkIcon && (
              <Badge
                variant="secondary"
                className="h-5 px-1.5 gap-1 text-[10px] font-medium"
                style={{
                  backgroundColor: networkInfo.bgColor,
                  color: networkInfo.color,
                }}
              >
                <NetworkIcon className="h-3 w-3" aria-hidden />
                {networkInfo.name}
              </Badge>
            )}
            <span className="text-sm font-medium leading-tight">
              {issue.title}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-snug">
            {issue.description}
          </p>

          {issue.affectedItems && issue.affectedItems.length > 0 && (
            <div className="flex items-center gap-1 pt-1 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Afecta:
              </span>
              {issue.affectedItems.slice(0, 6).map(idx => {
                const isVideo = videoIndices?.has(idx);
                return (
                  <div
                    key={idx}
                    className="h-7 w-7 rounded border border-border overflow-hidden bg-muted flex items-center justify-center text-[10px] font-mono text-muted-foreground relative"
                    title={`Ficheiro ${idx + 1}${isVideo ? ' (vídeo)' : ''}`}
                  >
                    {mediaThumbnails?.[idx] ? (
                      <img
                        src={mediaThumbnails[idx]}
                        alt={`Ficheiro ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : isVideo ? (
                      <Video className="h-3.5 w-3.5" aria-label="Vídeo" />
                    ) : (
                      `#${idx + 1}`
                    )}
                  </div>
                );
              })}
              {issue.affectedItems.length > 6 && (
                <span className="text-[10px] text-muted-foreground">
                  +{issue.affectedItems.length - 6}
                </span>
              )}
            </div>
          )}

          {(issue.autoFixable || issue.dismissable) && (
            <div className="flex items-center gap-2 pt-1.5">
              {issue.autoFixable && issue.fixAction && (
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs"
                  disabled={busy}
                  onClick={handleFix}
                >
                  {busy && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                  {issue.fixLabel ?? 'Corrigir'}
                </Button>
              )}
              {issue.dismissable && onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => onDismiss(issue.id)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Dispensar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
