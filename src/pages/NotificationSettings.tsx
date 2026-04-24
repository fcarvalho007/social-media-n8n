import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, Clock, Mail, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

const weekdays = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 7, label: 'Dom' },
];

type ReminderChannel = 'email' | 'whatsapp' | 'telegram' | 'push';

type Preferences = {
  reminder_channel: ReminderChannel;
  reminder_minutes_before: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  reminder_weekdays: number[];
  email_tested_at?: string | null;
};

const defaults: Preferences = {
  reminder_channel: 'email',
  reminder_minutes_before: 15,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  reminder_weekdays: [1, 2, 3, 4, 5, 6, 7],
  email_tested_at: null,
};

export default function NotificationSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('reminder_channel, reminder_minutes_before, quiet_hours_start, quiet_hours_end, reminder_weekdays, email_tested_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) toast.error('Não foi possível carregar as preferências.');
      if (mounted) setPrefs({ ...defaults, ...(data as Partial<Preferences> | null ?? {}) });
      if (mounted) setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [user]);

  const channelLabel = useMemo(() => ({
    email: 'Email',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    push: 'Push',
  }[prefs.reminder_channel]), [prefs.reminder_channel]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('user_notification_preferences').upsert({
      user_id: user.id,
      reminder_channel: prefs.reminder_channel,
      reminder_minutes_before: prefs.reminder_minutes_before,
      quiet_hours_start: prefs.quiet_hours_start,
      quiet_hours_end: prefs.quiet_hours_end,
      reminder_weekdays: prefs.reminder_weekdays,
    } as any);
    setSaving(false);
    if (error) {
      toast.error('Não foi possível guardar as preferências.');
      return;
    }
    toast.success('Preferências de lembrete guardadas.');
  };

  const sendTest = async () => {
    setTesting(true);
    const { error } = await supabase.functions.invoke('send_story_reminder', { body: { test: true } });
    setTesting(false);
    if (error) {
      toast.error('Não foi possível enviar o email de teste.');
      return;
    }
    setPrefs((current) => ({ ...current, email_tested_at: new Date().toISOString() }));
    toast.success('Email de teste enviado.');
  };

  const toggleWeekday = (value: number, checked: boolean) => {
    setPrefs((current) => ({
      ...current,
      reminder_weekdays: checked
        ? Array.from(new Set([...current.reminder_weekdays, value])).sort()
        : current.reminder_weekdays.filter((day) => day !== value),
    }));
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <header className="space-y-2">
          <Badge variant="secondary" className="w-fit gap-2"><Bell className="h-3.5 w-3.5" /> Lembretes</Badge>
          <h1 className="text-3xl font-semibold tracking-tight">Notificações</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">Define como recebes lembretes para publicar Stories com Link e outras ações semi-automáticas.</p>
        </header>

        <Card className="manual-card-shell">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Mail className="h-5 w-5 text-primary" /> Canal preferido</CardTitle>
            <CardDescription>O email está ativo nesta fase. Os restantes canais ficam preparados para integração futura.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="manual-field-stack">
              <Label>Canal</Label>
              <Select value={prefs.reminder_channel} onValueChange={(value) => setPrefs((current) => ({ ...current, reminder_channel: value as ReminderChannel }))} disabled={loading}>
                <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp" disabled>WhatsApp — em breve</SelectItem>
                  <SelectItem value="telegram" disabled>Telegram — em breve</SelectItem>
                  <SelectItem value="push" disabled>Push — em breve</SelectItem>
                </SelectContent>
              </Select>
              <p className="manual-microcopy">Canal atual: {channelLabel}</p>
            </div>
            <div className="manual-field-stack">
              <Label>Teste de email</Label>
              <Button type="button" variant="outline" className="min-h-11 justify-start gap-2" onClick={sendTest} disabled={testing || loading}>
                <Send className="h-4 w-4" /> {testing ? 'A enviar...' : 'Enviar email de teste'}
              </Button>
              {prefs.email_tested_at && <p className="manual-microcopy flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Testado com sucesso</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="manual-card-shell">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Clock className="h-5 w-5 text-primary" /> Janela de lembretes</CardTitle>
            <CardDescription>As horas são interpretadas no fuso de Lisboa.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="manual-field-stack">
              <Label>Antecedência</Label>
              <Select value={String(prefs.reminder_minutes_before)} onValueChange={(value) => setPrefs((current) => ({ ...current, reminder_minutes_before: Number(value) }))} disabled={loading}>
                <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutos</SelectItem>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">60 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="manual-field-stack">
              <Label>Não incomodar desde</Label>
              <Input type="time" className="min-h-11" value={prefs.quiet_hours_start} onChange={(e) => setPrefs((current) => ({ ...current, quiet_hours_start: e.target.value }))} disabled={loading} />
            </div>
            <div className="manual-field-stack">
              <Label>Até</Label>
              <Input type="time" className="min-h-11" value={prefs.quiet_hours_end} onChange={(e) => setPrefs((current) => ({ ...current, quiet_hours_end: e.target.value }))} disabled={loading} />
            </div>
            <div className="manual-field-stack sm:col-span-3">
              <Label>Dias ativos</Label>
              <div className="flex flex-wrap gap-2">
                {weekdays.map((day) => (
                  <label key={day.value} className="manual-option-button flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                    <Checkbox checked={prefs.reminder_weekdays.includes(day.value)} onCheckedChange={(checked) => toggleWeekday(day.value, checked === true)} disabled={loading} />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Só são guardadas preferências do utilizador autenticado.</p>
          <Button type="button" className="min-h-11" onClick={save} disabled={saving || loading}>{saving ? 'A guardar...' : 'Guardar preferências'}</Button>
        </div>
      </div>
    </main>
  );
}
