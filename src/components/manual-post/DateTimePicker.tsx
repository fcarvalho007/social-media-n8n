import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  scheduledDate: Date | undefined;
  onScheduledDateChange: (date: Date | undefined) => void;
  scheduleAsap: boolean;
  onScheduleAsapChange: (asap: boolean) => void;
}

export function DateTimePicker({
  scheduledDate,
  onScheduledDateChange,
  scheduleAsap,
  onScheduleAsapChange,
}: DateTimePickerProps) {
  const [time, setTime] = useState<string>(
    scheduledDate ? format(scheduledDate, 'HH:mm') : '12:00'
  );

  const handleDateChange = (date: Date | undefined) => {
    if (date && time) {
      const [hours, minutes] = time.split(':').map(Number);
      date.setHours(hours, minutes);
    }
    onScheduledDateChange(date);
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (scheduledDate) {
      const [hours, minutes] = newTime.split(':').map(Number);
      const newDate = new Date(scheduledDate);
      newDate.setHours(hours, minutes);
      onScheduledDateChange(newDate);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data e hora</CardTitle>
        <CardDescription>Quando deve esta publicação ser publicada?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
          <div className="space-y-0.5">
            <Label htmlFor="asap-mode" className="text-sm font-semibold">
              Logo que possível
            </Label>
            <p className="text-xs text-muted-foreground">
              Publicar imediatamente após aprovação
            </p>
          </div>
          <Switch
            id="asap-mode"
            checked={scheduleAsap}
            onCheckedChange={onScheduleAsapChange}
          />
        </div>

        {!scheduleAsap && (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !scheduledDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, 'dd/MM/yyyy') : 'Escolha uma data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={handleDateChange}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="time-input" className="text-sm font-semibold mb-2 block">
                Hora (24h)
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time-input"
                  type="time"
                  value={time}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="pl-10"
                  disabled={!scheduledDate}
                />
              </div>
            </div>

            {scheduledDate && (
              <div className="text-sm text-muted-foreground bg-accent/30 p-3 rounded-lg">
                <span className="font-semibold">Agendado para:</span>{' '}
                {format(scheduledDate, "dd/MM/yyyy 'às' HH:mm")}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
