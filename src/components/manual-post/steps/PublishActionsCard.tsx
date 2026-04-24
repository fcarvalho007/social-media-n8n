import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Loader2, CalendarIcon, Rocket, Send } from 'lucide-react';
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
}

/**
 * Cartão sticky com barra de progresso, painel de validação e botões
 * primários (Publicar, Guardar rascunho, Submeter para aprovação).
 * Visível apenas em desktop (`sm:block`).
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
  } = props;
  const storyLinkMode = selectedFormats.includes('instagram_story_link');

  const publishDisabled =
    publishing ||
    submitting ||
    saving ||
    isUploading ||
    (selectedFormats.length > 0 && !smartValidation.canPublish);

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
