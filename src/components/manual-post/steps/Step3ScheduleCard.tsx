import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays, nextDay, format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  CalendarIcon,
  ChevronLeft,
  CheckCircle2,
  Clock,
  Globe,
  Rocket,
} from 'lucide-react';
import { SectionHelp, getSectionTooltip } from '@/components/manual-post/SectionHelp';

interface Step3ScheduleCardProps {
  scheduleAsap: boolean;
  onScheduleAsapChange: (asap: boolean) => void;
  scheduledDate: Date | undefined;
  onScheduledDateChange: (date: Date | undefined) => void;
  time: string;
  onTimeChange: (time: string) => void;
  onPreviousStep: () => void;
}

/**
 * Cartão de agendamento (Step 3b). Toggle "Agora" vs "Agendar" + atalhos de
 * data, calendário, selectores hora/min, presets de hora e preview agendado.
 */
export function Step3ScheduleCard(props: Step3ScheduleCardProps) {
  const {
    scheduleAsap,
    onScheduleAsapChange,
    scheduledDate,
    onScheduledDateChange,
    time,
    onTimeChange,
    onPreviousStep,
  } = props;

  return (
    <Card className="manual-card-shell w-full max-w-full">
      <CardHeader className="manual-card-content pb-3">
        <CardTitle className="manual-section-title flex items-center gap-2">
          Agendamento
          <SectionHelp content={getSectionTooltip('scheduling')} />
        </CardTitle>
        <CardDescription className="manual-section-description">Define quando publicar</CardDescription>
      </CardHeader>
      <CardContent className="manual-card-content manual-group-stack pt-0">
        {/* Toggle Pill Style */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => onScheduleAsapChange(true)}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-manual-expand flex items-center justify-center gap-2',
              scheduleAsap
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Rocket className="h-4 w-4" strokeWidth={1.5} />
            <span className="hidden xs:inline">Publicar agora</span>
            <span className="xs:hidden">Agora</span>
          </button>
          <button
            type="button"
            onClick={() => onScheduleAsapChange(false)}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-manual-expand flex items-center justify-center gap-2',
              !scheduleAsap
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <CalendarIcon className="h-4 w-4" strokeWidth={1.5} />
            Agendar
          </button>
        </div>

        {scheduleAsap ? (
          <div className="space-y-2 py-3 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
              <Rocket className="h-4 w-4 text-primary" />
              <span>Publicação imediata após clicares em Publicar</span>
            </div>
          </div>
        ) : (
          <div className="manual-group-stack manual-enter">
            {/* Timezone indicator */}
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-manual-micro text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span className="hidden xs:inline">Fuso: </span>
              <strong className="text-foreground">Lisboa</strong>
              <span className="text-muted-foreground/60">•</span>
              <span>{format(new Date(), 'HH:mm', { locale: pt })}</span>
            </div>

            {/* Quick date shortcuts */}
            <div className="manual-field-stack">
              <Label className="manual-field-label text-muted-foreground">Atalhos rápidos</Label>
              <div className="grid grid-cols-2 gap-1 xs:gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onScheduledDateChange(new Date())}
                  className={cn(
                    'h-8 text-xs',
                    scheduledDate &&
                      format(scheduledDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') &&
                      'bg-primary/10 border-primary/50',
                  )}
                >
                  Hoje
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onScheduledDateChange(addDays(new Date(), 1))}
                  className={cn(
                    'h-8 text-xs',
                    scheduledDate &&
                      format(scheduledDate, 'yyyy-MM-dd') === format(addDays(new Date(), 1), 'yyyy-MM-dd') &&
                      'bg-primary/10 border-primary/50',
                  )}
                >
                  Amanhã
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onScheduledDateChange(nextDay(new Date(), 2))}
                  className={cn(
                    'h-8 text-xs',
                    scheduledDate &&
                      scheduledDate.getDay() === 2 &&
                      scheduledDate > new Date() &&
                      'bg-primary/10 border-primary/50',
                  )}
                >
                  Terça
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onScheduledDateChange(nextDay(new Date(), 4))}
                  className={cn(
                    'h-8 text-xs',
                    scheduledDate &&
                      scheduledDate.getDay() === 4 &&
                      scheduledDate > new Date() &&
                      'bg-primary/10 border-primary/50',
                  )}
                >
                  Quinta
                </Button>
              </div>
            </div>

            {/* Date picker */}
            <div className="manual-field-stack">
              <Label className="manual-field-label">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-11',
                      !scheduledDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {scheduledDate ? (
                      <span className="capitalize">
                        {format(scheduledDate, "EEEE, d 'de' MMMM", { locale: pt })}
                      </span>
                    ) : (
                      'Escolher data'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={onScheduledDateChange}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time picker with presets */}
            <div className="manual-field-stack">
              <Label className="manual-field-label">Hora</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={time.split(':')[0]}
                  onValueChange={(hour) => onTimeChange(`${hour}:${time.split(':')[1] || '00'}`)}
                >
                  <SelectTrigger className="h-11">
                    <Clock className="h-4 w-4 mr-2 text-primary" />
                    <SelectValue placeholder="Hora" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i).padStart(2, '0')}>
                        {String(i).padStart(2, '0')}h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={time.split(':')[1] || '00'}
                  onValueChange={(min) => onTimeChange(`${time.split(':')[0]}:${min}`)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="00">00 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time presets */}
              <div className="overflow-x-auto scrollbar-hide pb-1">
                <div className="flex gap-1 xs:gap-1.5 w-max xs:w-auto xs:flex-wrap mt-2">
                  {['09:00', '12:00', '15:00', '18:00', '21:00'].map((preset) => (
                    <Badge
                      key={preset}
                      variant="outline"
                      className={cn(
                        'manual-chip flex-shrink-0 cursor-pointer transition-colors hover:bg-primary/10',
                        time === preset && 'bg-primary/10 border-primary/50',
                      )}
                      onClick={() => onTimeChange(preset)}
                    >
                      {preset}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Scheduled preview */}
            {scheduledDate && time && (
              <div className="space-y-1 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  Agendado para:
                </div>
                <div className="text-base font-semibold capitalize">
                  {format(scheduledDate, "EEEE, d 'de' MMMM 'às'", { locale: pt })} {time}
                </div>
                <p className="text-xs text-muted-foreground">Fuso horário de Lisboa (WET/WEST)</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3 Navigation */}
        <div className="mt-4 flex justify-start border-t border-border/40 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreviousStep}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
