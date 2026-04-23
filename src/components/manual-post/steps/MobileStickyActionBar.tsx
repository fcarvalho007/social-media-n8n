import { Button } from '@/components/ui/button';
import { Save, Calendar as CalendarIcon, Loader2, Rocket, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ValidationMobileBadge } from '@/components/manual-post/ValidationSidebar';
import type { PostFormat } from '@/types/social';

interface SmartValidationLike {
  canPublish: boolean;
  errorCount: number;
  warningCount: number;
  isReady?: boolean;
}

interface MobileStickyActionBarProps {
  currentStep: number;
  scheduleAsap: boolean;
  scheduledDate?: Date;
  time: string;
  selectedFormats: PostFormat[];
  smartValidation: SmartValidationLike;
  onOpenValidationSheet: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onOpenPreview: () => void;
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
  onOpenPreview,
  saving,
  submitting,
  publishing,
  isUploading,
}: MobileStickyActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-md border-t shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.15)] lg:hidden z-50 w-screen max-w-[100vw] overflow-hidden">
      {/* Mini progress indicator */}
      <div className="flex justify-center py-1 xs:py-1.5 border-b border-border/50">
        <div className="flex items-center gap-1 xs:gap-1.5">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={cn(
                'h-1 xs:h-1.5 rounded-full transition-all duration-200',
                step <= currentStep ? 'w-5 xs:w-6 bg-primary' : 'w-1 xs:w-1.5 bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
      </div>

      {/* Scheduled preview */}
      {!scheduleAsap && scheduledDate && (
        <div className="px-2 xs:px-4 py-1 xs:py-1.5 bg-blue-50 dark:bg-blue-950/30 text-center text-[10px] xs:text-xs text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1 xs:gap-1.5">
          <CalendarIcon className="h-3 w-3" />
          <span>
            Agendado: {format(scheduledDate, 'd MMM', { locale: pt })} às {time}
          </span>
        </div>
      )}

      {/* Validation badge */}
      {selectedFormats.length > 0 && (
        <div className="flex justify-center py-0.5 xs:py-1">
          <ValidationMobileBadge validation={smartValidation} onClick={onOpenValidationSheet} />
        </div>
      )}

      {/* Action buttons */}
      <div className="p-2 xs:p-2.5 sm:p-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] xs:pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex gap-2 xs:gap-2.5 sm:gap-3 w-full max-w-full">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onSaveDraft}
          disabled={saving || submitting || publishing}
          className="h-11 w-11 xs:h-12 xs:w-12 sm:h-12 sm:w-12 flex-shrink-0"
          aria-label="Guardar rascunho"
        >
          <Save className="h-5 w-5 xs:h-5 xs:w-5 sm:h-5 sm:w-5" />
        </Button>

        <Button
          type="button"
          onClick={onPublish}
          disabled={publishing || submitting || saving || isUploading || selectedFormats.length === 0}
          className={cn(
            'flex-1 h-11 xs:h-12 sm:h-12 font-semibold text-white press-effect text-sm xs:text-base',
            !scheduleAsap && scheduledDate
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400'
              : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400',
          )}
        >
          {publishing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : !scheduleAsap && scheduledDate ? (
            <>
              <CalendarIcon className="h-5 w-5 mr-2" />
              <span>Agendar</span>
            </>
          ) : (
            <>
              <Rocket className="h-5 w-5 mr-2" />
              <span>Publicar</span>
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onOpenPreview}
          className="h-11 w-11 xs:h-12 xs:w-12 sm:h-12 sm:w-12 flex-shrink-0"
          aria-label="Pré-visualizar"
        >
          <Eye className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
