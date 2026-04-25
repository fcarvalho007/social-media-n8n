import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Loader2, CalendarIcon, Rocket, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ValidationSidebar } from '@/components/manual-post/ValidationSidebar';
import { ValidationSummary } from '@/lib/validation/types';
import { PostFormat } from '@/types/social';

interface PublishActionsCardProps {
  // Estado de progresso
  saving: boolean;
  submitting: boolean;
  publishing: boolean;
  isUploading: boolean;
  uploadProgress: number;

  // Validação
  selectedFormats: PostFormat[];
  smartValidation: ValidationSummary;
  mediaFiles: File[];

  // Agendamento (afecta o estilo do CTA)
  scheduleAsap: boolean;
  scheduledDate: Date | undefined;

  // Acções
  onPublish: () => void;
  onSaveDraft: () => void;
  onOpenDrafts: () => void;
  onViewCalendar: () => void;
  onSubmitForApproval: () => void;

  // ── Modo barra fixa global (Prompt 3/4) ─────────────────────────────
  /** Quando `true`, o cartão é renderizado como barra fixa no fundo do
   *  viewport, com contador de progresso e toggle de modo guiado. */
  fixedBottom?: boolean;
  /** Número de secções concluídas (0..totalSteps). */
  completedSteps?: number;
  /** Total de secções consideradas para o contador. */
  totalSteps?: number;
  /** Indica que existem erros de validação que bloqueiam a publicação. */
  hasErrors?: boolean;
  /** Callback chamado quando o utilizador clica no CTA em estado de erro. */
  onShowValidationIssues?: () => void;
  /** Estado actual do toggle "Modo guiado" (cinematic flow). */
  guidedEnabled?: boolean;
  /** Toggle do "Modo guiado". */
  onToggleGuided?: () => void;
}

/**
 * Cartão / barra de acções primárias.
 *
 * - Modo padrão (`fixedBottom !== true`): comportamento original (sticky
 *   sidebar em desktop, escondido em mobile).
 * - Modo `fixedBottom=true`: barra global fixa no fundo do viewport com
 *   contador "X/Total", barra de progresso fina, toggle "Modo guiado",
 *   CTA principal, secundário e acções discretas.
 */
export function PublishActionsCard(props: PublishActionsCardProps) {
  const {
    saving,
    submitting,
    publishing,
    isUploading,
    uploadProgress,
    selectedFormats,
    smartValidation,
    mediaFiles,
    scheduleAsap,
    scheduledDate,
    onPublish,
    onSaveDraft,
    onOpenDrafts,
    onViewCalendar,
    onSubmitForApproval,
    fixedBottom = false,
    completedSteps = 0,
    totalSteps = 5,
    hasErrors = false,
    onShowValidationIssues,
    guidedEnabled,
    onToggleGuided,
  } = props;
  const storyLinkMode = selectedFormats.includes('instagram_story_link');

  const publishDisabled =
    publishing ||
    submitting ||
    saving ||
    isUploading ||
    (selectedFormats.length > 0 && !smartValidation.canPublish);

  // ── MODO BARRA FIXA GLOBAL ────────────────────────────────────────────
  // NOTA TÉCNICA (Prompt 4):
  // Esta abordagem assume uma única instância de `PublishActionsCard` com
  // `fixedBottom=true` activa em simultâneo (SPA com `/manual-create` como
  // única página que usa este componente). Se no futuro existirem múltiplas
  // instâncias em paralelo (ex.: split-view, modais com formulários
  // completos), migrar para:
  //   - Contexto React (StickyBarHeightContext) para coordenar consumidores;
  //   - OU scoped CSS via styled-component / CSS Module com altura local.
  // A variável CSS global `--sticky-bar-height` é actualizada via
  // ResizeObserver e consumida por:
  //   - `src/pages/ManualCreate.tsx` (paddingBottom do container);
  //   - `src/components/ui/sonner.tsx` (offset dos toasts).
  // Ver DESIGN_SYSTEM.md → "SectionCard IDs canónicos" para contexto.
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!fixedBottom) return;
    const node = barRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const apply = (height: number) => {
      document.documentElement.style.setProperty('--sticky-bar-height', `${Math.round(height)}px`);
    };

    apply(node.offsetHeight);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        apply(entry.contentRect.height);
      }
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--sticky-bar-height');
    };
  }, [fixedBottom]);

  if (fixedBottom) {
    const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    const showError = hasErrors && selectedFormats.length > 0;
    const handlePrimary = showError && onShowValidationIssues ? onShowValidationIssues : onPublish;

    return (
      <div
        ref={barRef}
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md',
          'shadow-[0_-4px_24px_rgba(0,0,0,0.08)]',
        )}
        role="region"
        aria-label="Acções de publicação"
      >
        <div className="manual-create-action-bar mx-auto w-full max-w-screen-xl space-y-2 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          {/* Linha de topo: contador + progresso + toggle modo guiado */}
          <div className="flex items-center gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
                {completedSteps === totalSteps ? (
                  <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={2} />
                ) : (
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-[10px]"
                    aria-hidden="true"
                  />
                )}
                <span>
                  <span className="text-foreground font-semibold">{completedSteps}</span>
                  <span className="text-muted-foreground">/{totalSteps}</span>
                  <span className="ml-1 hidden sm:inline">secções completas</span>
                </span>
              </div>
              <Progress value={progressPct} className="hidden h-1 max-w-[240px] flex-1 sm:block" />
            </div>

            {onToggleGuided && (
              <div className="flex shrink-0 items-center gap-2">
                <Label
                  htmlFor="guided-mode-toggle"
                  className="cursor-pointer text-xs text-muted-foreground sm:text-sm"
                >
                  Modo guiado
                </Label>
                <Switch
                  id="guided-mode-toggle"
                  checked={!!guidedEnabled}
                  onCheckedChange={onToggleGuided}
                  aria-label="Activar modo guiado (transições cinematográficas)"
                />
              </div>
            )}
          </div>

          {/* Upload progress (quando aplicável) */}
          {(saving || submitting || publishing) && uploadProgress > 0 && (
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">
                {saving ? 'A guardar...' : publishing ? 'A publicar...' : 'A submeter...'}
              </span>
              <Progress value={uploadProgress} className="h-1 flex-1" />
              <span className="font-medium tabular-nums">{uploadProgress}%</span>
            </div>
          )}

          {/* Linha de acções primárias */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              size="lg"
              onClick={handlePrimary}
              disabled={!showError && publishDisabled}
              className={cn(
                'flex-1 font-semibold transition-all duration-200 active:scale-[0.98]',
                showError
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : !scheduleAsap && scheduledDate
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-success text-success-foreground hover:bg-success/90',
                'hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50',
              )}
              aria-label={
                showError
                  ? 'Corrige antes de publicar'
                  : storyLinkMode
                    ? scheduleAsap
                      ? 'Gerar pacote e publicar'
                      : 'Agendar lembrete'
                    : !scheduleAsap && scheduledDate
                      ? 'Agendar publicação'
                      : 'Publicar agora'
              }
            >
              {showError ? (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Corrige antes de publicar
                </>
              ) : publishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {storyLinkMode
                    ? 'A preparar...'
                    : !scheduleAsap && scheduledDate
                      ? 'A agendar...'
                      : 'A publicar...'}
                </>
              ) : storyLinkMode ? (
                <>
                  {scheduleAsap ? <Rocket className="mr-2 h-4 w-4" /> : <CalendarIcon className="mr-2 h-4 w-4" />}
                  {scheduleAsap ? 'Gerar pacote e publicar' : 'Agendar lembrete'}
                </>
              ) : !scheduleAsap && scheduledDate ? (
                <>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Agendar para {format(scheduledDate, "d 'de' MMM", { locale: pt })}
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Publicar Agora
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onSubmitForApproval}
              disabled={submitting || saving || publishing || isUploading}
              className="sm:w-auto"
              aria-label="Submeter para aprovação"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A submeter...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submeter para aprovação
                </>
              )}
            </Button>
          </div>

          {/* Linha de acções secundárias */}
          <div className="flex items-center justify-center gap-3 text-[11px] sm:text-xs">
            <button
              onClick={onSaveDraft}
              disabled={saving || submitting || publishing || isUploading}
              className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {saving ? 'A guardar...' : 'Guardar rascunho'}
            </button>
            <span className="text-muted-foreground/40">·</span>
            <button
              onClick={onOpenDrafts}
              disabled={saving || submitting}
              className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Ver rascunhos
            </button>
            <span className="text-muted-foreground/40">·</span>
            <button
              onClick={onViewCalendar}
              disabled={saving || submitting}
              className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Ver calendário
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MODO PADRÃO (sidebar / sticky no desktop) ─────────────────────────
  return (
    <Card className="manual-card-shell hidden border-2 bg-card/95 shadow-lg backdrop-blur-sm sm:block lg:sticky lg:bottom-4">
      <CardContent className="manual-card-content manual-group-stack">
        {(saving || submitting || publishing) && uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-manual-micro sm:text-sm">
              <span className="text-muted-foreground">
                {saving ? 'A guardar...' : publishing ? 'A publicar...' : 'A submeter...'}
              </span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Smart Pre-Validation Panel (real-time) */}
        {selectedFormats.length > 0 && (
          <ValidationSidebar validation={smartValidation} mediaFiles={mediaFiles} />
        )}

        {/* Primary Actions Row */}
        <div className="flex gap-3">
          <Button
            type="button"
            size="lg"
            onClick={onPublish}
            disabled={publishDisabled}
            className={cn(
              'flex-1 font-semibold',
              !scheduleAsap && scheduledDate
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-success text-success-foreground hover:bg-success/90',
              'hover:shadow-lg active:scale-[0.98] transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            aria-label={storyLinkMode ? (scheduleAsap ? 'Gerar pacote e publicar' : 'Agendar lembrete') : (!scheduleAsap && scheduledDate ? 'Agendar publicação' : 'Publicar agora')}
          >
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {storyLinkMode ? 'A preparar...' : (!scheduleAsap && scheduledDate ? 'A agendar...' : 'A publicar...')}
              </>
            ) : (
              <>
                {storyLinkMode ? (
                  <>
                    {scheduleAsap ? <Rocket className="h-4 w-4 mr-2" /> : <CalendarIcon className="h-4 w-4 mr-2" />}
                    {scheduleAsap ? 'Gerar pacote e publicar' : 'Agendar lembrete'}
                  </>
                ) : !scheduleAsap && scheduledDate ? (
                  <>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Agendar para {format(scheduledDate, "d 'de' MMM", { locale: pt })}
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Publicar Agora
                  </>
                )}
              </>
            )}
          </Button>
        </div>

        {/* Secondary Actions Row */}
        <div className="flex items-center justify-center gap-4 pt-2 text-manual-micro">
          <button
            onClick={onSaveDraft}
            disabled={saving || submitting || publishing || isUploading}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {saving ? 'A guardar...' : 'Guardar rascunho'}
          </button>
          <span className="text-muted-foreground/50">|</span>
          <button
            onClick={onOpenDrafts}
            disabled={saving || submitting}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Ver rascunhos
          </button>
          <span className="text-muted-foreground/50">|</span>
          <button
            onClick={onViewCalendar}
            disabled={saving || submitting}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Ver calendário
          </button>
        </div>

        {/* Submit for Approval */}
        <Button
          type="button"
          variant="secondary"
          onClick={onSubmitForApproval}
          disabled={submitting || saving || publishing || isUploading}
          className="w-full"
          aria-label="Submeter para aprovação"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              A submeter...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submeter para aprovação
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
