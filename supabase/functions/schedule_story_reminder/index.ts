import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Preferences = {
  reminder_channel: 'email' | 'whatsapp' | 'telegram' | 'push';
  reminder_minutes_before: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  reminder_weekdays: number[];
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function parseTime(value: string) {
  const [hour, minute] = value.split(':').map((part) => Number(part));
  return { hour: Number.isFinite(hour) ? hour : 0, minute: Number.isFinite(minute) ? minute : 0 };
}

function weekdayLisbon(date: Date) {
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', weekday: 'short' }).format(date);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[weekday] ?? 1;
}

function lisbonParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return parts;
}

function isInQuietHours(date: Date, prefs: Preferences) {
  const parts = lisbonParts(date);
  const current = Number(parts.hour) * 60 + Number(parts.minute);
  const start = parseTime(prefs.quiet_hours_start);
  const end = parseTime(prefs.quiet_hours_end);
  const startMin = start.hour * 60 + start.minute;
  const endMin = end.hour * 60 + end.minute;
  return startMin <= endMin ? current >= startMin && current < endMin : current >= startMin || current < endMin;
}

function nextAllowedDate(initial: Date, prefs: Preferences) {
  const allowed = prefs.reminder_weekdays?.length ? prefs.reminder_weekdays : [1, 2, 3, 4, 5, 6, 7];
  let date = new Date(initial);

  for (let i = 0; i < 14; i += 1) {
    if (!allowed.includes(weekdayLisbon(date))) {
      date = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      date.setUTCHours(8, 0, 0, 0);
      continue;
    }

    if (isInQuietHours(date, prefs)) {
      const end = parseTime(prefs.quiet_hours_end);
      const parts = lisbonParts(date);
      date = new Date(`${parts.year}-${parts.month}-${parts.day}T${String(end.hour).padStart(2, '0')}:${String(end.minute).padStart(2, '0')}:00+00:00`);
      if (!allowed.includes(weekdayLisbon(date))) continue;
    }
    return date;
  }

  return initial;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'Sessão obrigatória' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Sessão inválida' }, 401);

    const { story_id, target_at } = await req.json().catch(() => ({}));
    if (!story_id || typeof story_id !== 'string') return json({ error: 'Story inválida' }, 400);

    const { data: prefsData, error: prefsError } = await supabase
      .from('user_notification_preferences')
      .select('reminder_channel, reminder_minutes_before, quiet_hours_start, quiet_hours_end, reminder_weekdays')
      .eq('user_id', user.id)
      .maybeSingle();
    if (prefsError) throw prefsError;

    const prefs: Preferences = prefsData ?? {
      reminder_channel: 'email',
      reminder_minutes_before: 15,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      reminder_weekdays: [1, 2, 3, 4, 5, 6, 7],
    };

    const baseDate = target_at ? new Date(target_at) : new Date(Date.now() + prefs.reminder_minutes_before * 60_000);
    if (Number.isNaN(baseDate.getTime())) return json({ error: 'Data inválida' }, 400);

    const scheduledAt = nextAllowedDate(baseDate, prefs);

    const { error: updateError } = await supabase
      .from('story_link_publications')
      .update({
        reminder_scheduled_at: scheduledAt.toISOString(),
        reminder_channel: prefs.reminder_channel,
        status: 'ready',
        last_error: null,
      })
      .eq('id', story_id)
      .eq('user_id', user.id);
    if (updateError) throw updateError;

    return json({ ok: true, reminder_scheduled_at: scheduledAt.toISOString(), reminder_channel: prefs.reminder_channel });
  } catch (error) {
    console.error('[schedule_story_reminder]', error);
    return json({ error: error instanceof Error ? error.message : 'Erro inesperado' }, 500);
  }
});
