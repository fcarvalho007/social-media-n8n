import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { Loader2, Trash2, Save, Check, Clock, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActionBarProps {
  canApprove: boolean;
  onApprove: (scheduledDate?: Date) => Promise<void>;
  onReject: (notes?: string) => Promise<void>;
  onSave: () => Promise<void>;
}

export const ActionBar = ({ canApprove, onApprove, onReject, onSave }: ActionBarProps) => {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState('12:00');

  const handleApproveNow = async () => {
    setLoading(true);
    try {
      await onApprove();
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduledDate) return;
    
    setLoading(true);
    try {
      const [hours, minutes] = scheduledTime.split(':');
      const dateTime = new Date(scheduledDate);
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      await onApprove(dateTime);
      setShowScheduleDialog(false);
      setScheduledDate(undefined);
      setScheduledTime('12:00');
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

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="sticky bottom-0 border-t border-border bg-card/95 p-3 sm:p-4 md:p-5 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-lg">
        <div className="container flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between px-2 sm:px-4 max-w-4xl mx-auto">
          <Button
            variant="destructive"
            size="lg"
            onClick={() => setShowRejectDialog(true)}
            disabled={loading}
            className="sm:w-auto w-full h-11 sm:h-12 text-sm sm:text-base touch-target"
          >
            {loading ? <Loader2 className="mr-1.5 sm:mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 sm:mr-2 h-4 w-4" />}
            <span>Rejeitar</span>
          </Button>

          <div className="flex gap-2 sm:gap-3 flex-1 sm:flex-initial sm:justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={handleSave}
              disabled={loading}
              className="flex-1 sm:flex-initial h-11 sm:h-12 text-sm sm:text-base touch-target"
            >
              {loading ? <Loader2 className="mr-1.5 sm:mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 sm:mr-2 h-4 w-4" />}
              <span>Guardar</span>
            </Button>
          </div>

          <div className="flex gap-2 sm:w-auto w-full">
            <Button
              size="lg"
              onClick={handleApproveNow}
              disabled={!canApprove || loading}
              className="flex-1 sm:flex-initial bg-success hover:bg-success/90 h-11 sm:h-12 text-sm sm:text-base touch-target"
            >
              {loading ? <Loader2 className="mr-1.5 sm:mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 sm:mr-2 h-4 w-4" />}
              <span>Aprovar</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowScheduleDialog(true)}
              disabled={!canApprove || loading}
              className="h-11 sm:h-12 px-3 touch-target"
            >
              <Clock className="h-4 w-4" />
            </Button>
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

      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agendar Publicação</DialogTitle>
            <DialogDescription>
              Escolha a data e hora para publicar este conteúdo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "PPP", { locale: pt }) : "Escolher data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Hora</Label>
              <input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSchedule} disabled={!scheduledDate || loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
