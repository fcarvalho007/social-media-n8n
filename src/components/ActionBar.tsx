import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Trash2, Save, Check, Clock, CalendarIcon, AlertCircle, Instagram, Linkedin, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { format, addDays, isBefore, startOfToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface ActionBarProps {
  canApprove: boolean;
  onApprove: (scheduledDate?: Date) => Promise<void>;
  onReject: (notes?: string) => Promise<void>;
  onRevertToPending?: () => Promise<void>;
  onSave: () => Promise<void>;
  disabledReason?: string;
  isApproved?: boolean;
  publishTargets: { instagram: boolean; linkedin: boolean };
  validations: Record<string, any>;
  contentType?: string;
  mediaCount?: number;
  instagramQuotaText?: string;
  instagramCanPublish?: boolean;
}

export const ActionBar = ({ 
  canApprove, 
  onApprove, 
  onReject, 
  onRevertToPending, 
  onSave, 
  disabledReason, 
  isApproved,
  publishTargets,
  validations,
  contentType = 'carousel',
  mediaCount = 0,
  instagramQuotaText = '0/5',
  instagramCanPublish = true
}: ActionBarProps) => {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [validationError, setValidationError] = useState<string>();

  // Cleanup Dialog states when component unmounts
  useEffect(() => {
    return () => {
      setShowRejectDialog(false);
      setShowScheduleDialog(false);
    };
  }, []);

  const validateSchedule = (): boolean => {
    if (!scheduledDate) {
      setValidationError('Por favor, selecione uma data');
      return false;
    }

    const [hours, minutes] = scheduledTime.split(':');
    const dateTime = new Date(scheduledDate);
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (isBefore(dateTime, new Date())) {
      setValidationError('A data e hora devem ser no futuro');
      return false;
    }

    setValidationError(undefined);
    return true;
  };

  const handleApproveNow = async () => {
    setLoading(true);
    try {
      await onApprove();
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!validateSchedule()) return;
    
    setLoading(true);
    try {
      const [hours, minutes] = scheduledTime.split(':');
      const dateTime = new Date(scheduledDate!);
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      await onApprove(dateTime);
      setShowScheduleDialog(false);
      setScheduledDate(undefined);
      setScheduledTime('12:00');
      setValidationError(undefined);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(rejectNotes);
      setShowRejectDialog(false);
      setRejectNotes('');
    } finally {
      setLoading(false);
    }
  };

  const handleRevertToPending = async () => {
    if (!onRevertToPending) return;
    setLoading(true);
    try {
      await onRevertToPending();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave();
    } finally {
      setLoading(false);
    }
  };

  // Determine button label and icon based on selected platforms
  const getApproveButtonConfig = () => {
    const igActive = publishTargets.instagram;
    const liActive = publishTargets.linkedin;
    
    if (!igActive && !liActive) {
      return {
        label: 'Selecionar plataforma de publicação',
        icon: <AlertCircle className="mr-2 h-4 w-4" />,
        tooltip: 'Ativar pelo menos uma plataforma para prosseguir'
      };
    }
    
    if (igActive && liActive) {
      return {
        label: 'Aprovar e publicar no Instagram e LinkedIn',
        icon: (
          <div className="flex items-center mr-2 gap-1">
            <Instagram className="h-4 w-4" />
            <Linkedin className="h-4 w-4" />
          </div>
        ),
        tooltip: 'Publicar em ambas as plataformas após validação'
      };
    }
    
    if (igActive) {
      return {
        label: 'Aprovar e publicar no Instagram',
        icon: <Instagram className="mr-2 h-4 w-4" />,
        tooltip: 'Publicar no Instagram após validação'
      };
    }
    
    return {
      label: 'Aprovar e publicar no LinkedIn',
      icon: <Linkedin className="mr-2 h-4 w-4" />,
      tooltip: 'Publicar no LinkedIn após validação'
    };
  };

  const approveConfig = getApproveButtonConfig();

  // Get validation status for each platform
  const getValidationIcon = (platform: 'instagram' | 'linkedin') => {
    if (!publishTargets[platform]) return null;
    
    const validation = validations[platform];
    if (!validation) return null;
    
    if (validation.errors?.length > 0) {
      return <XCircle className="h-3 w-3 text-destructive" />;
    }
    if (validation.warnings?.length > 0) {
      return <AlertTriangle className="h-3 w-3 text-amber-500" />;
    }
    return <CheckCircle2 className="h-3 w-3 text-success" />;
  };

  const getContentTypeLabel = () => {
    if (contentType === 'carousel') {
      return `Carrossel • ${mediaCount} imagens`;
    }
    return contentType;
  };

  return (
    <>
      <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-md shadow-lg">
        {/* Sticky summary bar */}
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <div className="container max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            {/* Selected platforms */}
            <div className="flex items-center gap-2 flex-wrap">
              {publishTargets.instagram && (
                <Badge variant="secondary" className="flex items-center gap-1.5">
                  <Instagram className="h-3 w-3" />
                  Instagram
                  {getValidationIcon('instagram')}
                </Badge>
              )}
              {publishTargets.linkedin && (
                <Badge variant="secondary" className="flex items-center gap-1.5">
                  <Linkedin className="h-3 w-3" />
                  LinkedIn
                  {getValidationIcon('linkedin')}
                </Badge>
              )}
              {!publishTargets.instagram && !publishTargets.linkedin && (
                <Badge variant="outline" className="text-muted-foreground">
                  Nenhuma plataforma selecionada
                </Badge>
              )}
            </div>
            
            {/* Content summary */}
            <div className="text-sm text-muted-foreground">
              {getContentTypeLabel()}
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="p-4 md:p-5">
          <div className="container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 max-w-6xl mx-auto">
          {isApproved ? (
            <Button
              variant="outline"
              size="lg"
              onClick={handleRevertToPending}
              disabled={loading}
              className="sm:w-auto w-full h-12 text-base touch-target transition-all duration-150"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-2 h-4 w-4" />}
              <span>Voltar a Pendentes</span>
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="lg"
              onClick={() => setShowRejectDialog(true)}
              disabled={loading}
              className="sm:w-auto w-full h-12 text-base touch-target transition-all duration-150"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              <span>Rejeitar</span>
            </Button>
          )}

          <div className="flex gap-3 flex-1 sm:flex-initial sm:justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={handleSave}
              disabled={loading}
              className="flex-1 sm:flex-initial h-12 text-base touch-target transition-all duration-150 focus:ring-2 focus:ring-primary/40"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              <span>Guardar</span>
            </Button>
          </div>

          <div className="flex gap-2 sm:w-auto w-full">
            <div className="relative flex-1 sm:flex-initial">
              <Button
                size="lg"
                onClick={handleApproveNow}
                disabled={!canApprove || loading || ((publishTargets.instagram || publishTargets.linkedin) && !instagramCanPublish)}
                className={cn(
                  "w-full h-12 text-base touch-target transition-all duration-150 relative focus:ring-2 focus:ring-primary/40",
                  canApprove && "bg-success hover:bg-success/90 shadow-sm"
                )}
                title={
                  !canApprove 
                    ? disabledReason 
                    : (publishTargets.instagram || publishTargets.linkedin) && !instagramCanPublish
                    ? 'Quota de publicações excedida (5/mês)'
                    : approveConfig.tooltip
                }
                aria-label={approveConfig.label}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : approveConfig.icon}
                <span className="truncate">{approveConfig.label}</span>
                {(publishTargets.instagram || publishTargets.linkedin) && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "ml-2 font-mono text-xs absolute right-3",
                      !instagramCanPublish && "bg-red-500/20 text-red-100"
                    )}
                  >
                    {instagramQuotaText}
                  </Badge>
                )}
              </Button>
            </div>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowScheduleDialog(true)}
              disabled={!canApprove || loading}
              className="h-12 px-4 touch-target transition-all duration-150 focus:ring-2 focus:ring-primary/40"
              title={!canApprove ? disabledReason : 'Agendar publicação'}
            >
              <Clock className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </div>
      </div>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar esta publicação?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto marcará a publicação como rejeitada. Pode adicionar notas opcionais explicando o motivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-notes" className="mb-2 block">
              Notas de rejeição (opcional)
            </Label>
            <Textarea
              id="reject-notes"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Porquê esta publicação está a ser rejeitada?"
              className="min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive hover:bg-destructive/90"
            >
              Rejeitar Publicação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showScheduleDialog} onOpenChange={(open) => {
        setShowScheduleDialog(open);
        if (!open) {
          setValidationError(undefined);
          setScheduledDate(undefined);
          setScheduledTime('12:00');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              Agendar Publicação
            </DialogTitle>
            <DialogDescription>
              Escolha quando deseja que este conteúdo seja publicado automaticamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            {/* Quick Date Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Atalhos Rápidos</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const tomorrow = addDays(new Date(), 1);
                    tomorrow.setHours(12, 0, 0, 0);
                    setScheduledDate(tomorrow);
                    setValidationError(undefined);
                  }}
                  className="text-xs"
                >
                  Amanhã
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nextWeek = addDays(new Date(), 7);
                    nextWeek.setHours(12, 0, 0, 0);
                    setScheduledDate(nextWeek);
                    setValidationError(undefined);
                  }}
                  className="text-xs"
                >
                  +7 dias
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nextMonth = addDays(new Date(), 30);
                    nextMonth.setHours(12, 0, 0, 0);
                    setScheduledDate(nextMonth);
                    setValidationError(undefined);
                  }}
                  className="text-xs"
                >
                  +30 dias
                </Button>
              </div>
            </div>

            {/* Date Picker */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Selecionar Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "PPP", { locale: pt }) : "Escolher data personalizada"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={(date) => {
                      setScheduledDate(date);
                      setValidationError(undefined);
                    }}
                    disabled={(date) => isBefore(date, startOfToday())}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Picker */}
            <div className="space-y-3">
              <Label htmlFor="time" className="text-sm font-medium">Hora de Publicação</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => {
                    setScheduledTime(e.target.value);
                    setValidationError(undefined);
                  }}
                  className="pl-10 h-11"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A publicação será enviada automaticamente nesta hora
              </p>
            </div>

            {/* Preview */}
            {scheduledDate && (
              <div className="rounded-lg bg-muted/50 p-4 border">
                <p className="text-sm font-medium mb-1">Resumo do Agendamento</p>
                <p className="text-sm text-muted-foreground">
                  Publicação agendada para{' '}
                  <span className="font-semibold text-foreground">
                    {format(scheduledDate, "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                  </span>
                  {' às '}
                  <span className="font-semibold text-foreground">{scheduledTime}</span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowScheduleDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSchedule}
              disabled={loading || !scheduledDate}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Confirmar Agendamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
