import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Save, Calendar as CalendarIcon, Clock, FileText, Loader2, MoreHorizontal, Rocket, Send, CalendarDays, ArrowLeft, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { ValidationSummary } from '@/lib/validation/types';
import type { PostFormat } from '@/types/social';
import { useState } from 'react';

interface MobileStickyActionBarProps {
  currentStep: number;
  scheduleAsap: boolean;
  scheduledDate?: Date;
  time: string;
  selectedFormats: PostFormat[];
  smartValidation: ValidationSummary;
  onOpenValidationSheet: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onPreviousStep: () => void;
  onSubmitForApproval: () => void;
  onOpenDrafts: () => void;
  onViewCalendar: () => void;
  saving: boolean;
  submitting: boolean;
  publishing: boolean;
  isUploading: boolean;
}

/**
 * Sticky bottom bar for mobile (lg:hidden). Contains the step progress mini-indicator,
 * scheduled-date preview, validation badge and primary actions (save / publish / preview).
 *
 * Extracted from ManualCreate.tsx (Phase 4) — purely presentational.
 */
export function MobileStickyActionBar({
  currentStep,
  scheduleAsap,
  scheduledDate,
  time,
  selectedFormats,
  smartValidation,
  onOpenValidationSheet,
  onSaveDraft,
  onPublish,
  onPreviousStep,
  onSubmitForApproval,
  onOpenDrafts,
  onViewCalendar,
  saving,
  submitting,
  publishing,
  isUploading,
}: MobileStickyActionBarProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const hasContent = selectedFormats.length > 0;
  const hasBlockingErrors = hasContent && !smartValidation.canPublish;
  const isFutureSchedule = !scheduleAsap && !!scheduledDate;
  const disabled = publishing || submitting || saving || isUploading || !hasContent;
  const primaryLabel = !hasContent
    ? 'Continuar'
    : hasBlockingErrors
      ? 'Corrige antes de publicar'
      : isFutureSchedule
        ? 'Agendar'
        : 'Publicar agora';

  const handlePrimary = () => {
    if (hasBlockingErrors) {
      onOpenValidationSheet();
      return;
    }
    onPublish();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-screen max-w-[100vw] overflow-hidden border-t bg-background/98 shadow-[0_-4px_20px_-4px_hsl(var(--foreground)/0.15)] backdrop-blur-md lg:hidden">
      {/* Action buttons */}
      <div className="flex min-h-[72px] w-full max-w-full gap-2 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onPreviousStep}
          disabled={currentStep <= 1 || saving || submitting || publishing}
          className="h-11 w-11 flex-shrink-0"
          aria-label="Passo anterior"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          onClick={handlePrimary}
          disabled={disabled && !hasBlockingErrors}
          className={cn(
            'h-11 flex-1 gap-2 font-semibold press-effect text-sm',
            hasBlockingErrors
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {publishing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : hasBlockingErrors ? (
            <>
              <AlertCircle className="h-5 w-5" />
              <span>{primaryLabel}</span>
            </>
          ) : isFutureSchedule ? (
            <>
              <CalendarIcon className="h-5 w-5" />
              <span>{primaryLabel}</span>
            </>
          ) : (
            <>
              <Rocket className="h-5 w-5" />
              <span>{primaryLabel}</span>
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setOverflowOpen(true)}
          className="h-11 w-11 flex-shrink-0"
          aria-label="Mais ações"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      <Drawer open={overflowOpen} onOpenChange={setOverflowOpen}>
        <DrawerContent className="manual-mobile-sheet-safe">
          <DrawerHeader className="border-b pb-3 text-left">
            <DrawerTitle>Mais ações</DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-2 p-4">
            <Button type="button" variant="outline" className="manual-touch-target justify-start gap-2" onClick={() => { setOverflowOpen(false); onSaveDraft(); }} disabled={saving || submitting || publishing}>
              <Save className="h-4 w-4" />Guardar rascunho
            </Button>
            <Button type="button" variant="outline" className="manual-touch-target justify-start gap-2" onClick={() => { setOverflowOpen(false); onSubmitForApproval(); }} disabled={saving || submitting || publishing || !hasContent}>
              <Send className="h-4 w-4" />Submeter para aprovação
            </Button>
            <Button type="button" variant="outline" className="manual-touch-target justify-start gap-2" onClick={() => { setOverflowOpen(false); onOpenDrafts(); }}>
              <FileText className="h-4 w-4" />Ver rascunhos
            </Button>
            <Button type="button" variant="outline" className="manual-touch-target justify-start gap-2" onClick={() => { setOverflowOpen(false); onViewCalendar(); }}>
              <CalendarDays className="h-4 w-4" />Ver calendário
            </Button>
            {!scheduleAsap && scheduledDate && (
              <div className="mt-2 flex items-center gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />Agendado para {format(scheduledDate, 'd MMM', { locale: pt })} às {time}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
