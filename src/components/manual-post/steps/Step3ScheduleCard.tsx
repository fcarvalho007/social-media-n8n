import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays, nextDay, format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CalendarIcon, CheckCircle2, Clock, Mail, Globe, Rocket } from 'lucide-react';
import { SectionCard, SectionState } from '@/components/manual-post/ui/SectionCard';

interface Step3ScheduleCardProps {
  scheduleAsap: boolean;
  onScheduleAsapChange: (asap: boolean) => void;
  scheduledDate: Date | undefined;
  onScheduledDateChange: (date: Date | undefined) => void;
  time: string;
  onTimeChange: (time: string) => void;
  storyLinkMode?: boolean;
  /** Estado para o padrão de progressive disclosure. */
  state?: SectionState;
  stepNumber?: number;
  onActivate?: () => void;
  onEdit?: () => void;
}

/**
 * Cartão de agendamento (Step 3b) integrado no padrão de progressive
 * disclosure. Toggle "Agora" vs "Agendar" + atalhos de data, calendário,
 * selectores hora/min, presets de hora.
 *
 * Removido o card redundante de "Publicar agora" — quando `scheduleAsap`
 * é true, basta o toggle e uma única linha de confirmação.
 *
 * Esta secção usa `neverAutoCollapse` na SectionCard porque o utilizador
 * costuma alternar várias vezes entre "agora" e "agendar" antes de
 * publicar — colapsar prematuramente atrapalha o fluxo.
 */
export function Step3ScheduleCard(props: Step3ScheduleCardProps) {
  const {
    scheduleAsap,
    onScheduleAsapChange,
    scheduledDate,
    onScheduledDateChange,
    time,
    onTimeChange,
    storyLinkMode = false,
    state = 'active',
    stepNumber,
    onActivate,
    onEdit,
  } = props;

  // Resumo mostrado no estado `complete` da SectionCard (caso esteja activo).
  const summary = scheduleAsap ? (
    <span className="flex items-center gap-2 text-foreground">
      <Rocket className="h-4 w-4 text-primary" />
      {storyLinkMode ? 'Pacote abre imediatamente' : 'Publicar imediatamente'}
    </span>
  ) : scheduledDate ? (
    <span className="flex items-center gap-2 text-foreground">
      <CalendarIcon className="h-4 w-4 text-primary" />
      <span className="capitalize">
        {format(scheduledDate, "EEEE, d 'de' MMM 'às'", { locale: pt })} {time}
      </span>
      <span className="text-muted-foreground">· Lisboa</span>
    </span>
  ) : (
    <span className="text-muted-foreground">Por definir</span>
  );

  return (
    <SectionCard
      id="schedule"
      stepNumber={stepNumber}
      title={storyLinkMode ? 'Quando queres publicar?' : 'Agendamento'}
      icon={CalendarIcon}
      state={state}
      onActivate={onActivate}
      onEdit={onEdit}
      summary={summary}
      neverAutoCollapse
    >
      <div className="manual-group-stack">
        {/* Toggle Pill Style */}
        <div className="flex gap-1 rounded-lg bg-muted/60 p-1">
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
            <span className="hidden xs:inline">{storyLinkMode ? 'Agora' : 'Publicar agora'}</span>
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
            {storyLinkMode ? 'Agendar lembrete' : 'Agendar'}
          </button>
        </div>

        {scheduleAsap ? (
          // Linha simples — sem card redundante
          <p className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
            <Rocket className="h-4 w-4 text-primary" />
            <span>
              {storyLinkMode
                ? 'O pacote abre imediatamente para publicares manualmente.'
                : 'A publicação ocorre assim que clicares em Publicar.'}
            </span>
          </p>
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

            {/* Quick date shortcuts — 44px touch targets */}
            <div className="manual-field-stack">
              <Label className="manual-field-label text-muted-foreground">Atalhos rápidos</Label>
              <div className="grid grid-cols-2 gap-1.5 xs:gap-2">
                {([
                  { label: 'Hoje', date: new Date(), match: (d: Date) => format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') },
                  { label: 'Amanhã', date: addDays(new Date(), 1), match: (d: Date) => format(d, 'yyyy-MM-dd') === format(addDays(new Date(), 1), 'yyyy-MM-dd') },
                  { label: 'Terça', date: nextDay(new Date(), 2), match: (d: Date) => d.getDay() === 2 && d > new Date() },
                  { label: 'Quinta', date: nextDay(new Date(), 4), match: (d: Date) => d.getDay() === 4 && d > new Date() },
                ] as const).map(({ label, date, match }) => (
                  <Button
                    key={label}
                    type="button"
                    variant="outline"
                    onClick={() => onScheduledDateChange(date)}
                    className={cn(
                      'h-11 text-sm',
                      scheduledDate && match(scheduledDate) && 'bg-primary/10 border-primary/50',
                    )}
                  >
                    {label}
                  </Button>
                ))}
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
                    className={cn('p-3 pointer-events-auto')}
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

              {/* Time presets — chips de 44px */}
              <div className="overflow-x-auto scrollbar-hide pb-1">
                <div className="mt-2 flex w-max gap-1.5 xs:w-auto xs:flex-wrap">
                  {['09:00', '12:00', '15:00', '18:00', '21:00'].map((preset) => (
                    <Badge
                      key={preset}
                      variant="outline"
                      className={cn(
                        'flex h-11 min-w-[60px] flex-shrink-0 cursor-pointer items-center justify-center border px-3 text-sm transition-colors hover:bg-primary/10',
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
                  {storyLinkMode ? 'Lembrete agendado para:' : 'Agendado para:'}
                </div>
                <div className="text-base font-semibold capitalize">
                  {format(scheduledDate, "EEEE, d 'de' MMMM 'às'", { locale: pt })} {time}
                </div>
                <p className="text-xs text-muted-foreground">Fuso horário de Lisboa (WET/WEST)</p>
                {storyLinkMode && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    Pacote enviado por email · 15 min antes, se definido nas preferências.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
