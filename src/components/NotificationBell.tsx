import { useEffect, useRef, useState } from 'react';
import { Bell, Check, Trash2, CheckCheck, Loader2, RefreshCw, AlertCircle, Clock, UserRound, CircleCheck, CircleAlert, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow, isValid } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { destinoNotificacao } from '@/lib/notificacoes';
import { toast } from 'sonner';

const ICONES = { deadline: Clock, assignment: UserRound, success: CircleCheck, error: CircleAlert, warning: AlertCircle, info: Info };
const dataRelativa = (s: string) => {
  const d = new Date(s);
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true, locale: pt }) : 'Data indisponível';
};

export const NotificationBell = () => {
  const { notifications, unreadCount, isLoading, isFetching, error, refetch, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [aAbrir, setAAbrir] = useState<string | null>(null);
  const seq = useRef(0);
  useEffect(() => { ++seq.current; setAAbrir(null); }, [user?.id]);
  useEffect(() => () => { ++seq.current; }, []);
  const ocupado = markAsRead.isPending || markAllAsRead.isPending || deleteNotification.isPending;
  const mudarAberto = (v: boolean) => { setOpen(v); if (!v) { ++seq.current; setAAbrir(null); } };

  const abrir = async (n: Notification) => {
    const meu = ++seq.current;
    setAAbrir(n.id);
    try {
      const destino = await destinoNotificacao(n, async (id) => {
        const { data, error } = await supabase.from('tasks').select('project_id').eq('id', id).maybeSingle();
        if (error) throw new Error('Não foi possível abrir a tarefa. Tenta de novo.');
        return data?.project_id ?? null;
      });
      if (seq.current !== meu) return;
      if (!n.read) markAsRead.mutate(n.id);
      if (destino) { navigate(destino); mudarAberto(false); }
    } catch (e) {
      if (seq.current === meu) toast.error((e as Error).message);
    } finally {
      if (seq.current === meu) setAAbrir(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={mudarAberto}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative min-h-10 min-w-10" aria-label={unreadCount ? `Notificações · ${unreadCount} por ler` : 'Notificações'}>
          <Bell className="h-5 w-5" aria-hidden />
          {unreadCount > 0 && <Badge variant="destructive" aria-hidden className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs">{unreadCount > 9 ? '9+' : unreadCount}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] p-0" align="end" aria-label="Centro de notificações">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <h2 className="font-semibold">Notificações</h2>
          {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={() => markAllAsRead.mutate()} disabled={ocupado} className="min-h-9 gap-1"><CheckCheck className="h-4 w-4" aria-hidden />Marcar todas como lidas</Button>}
        </div>
        <div className="max-h-[min(65dvh,28rem)] overflow-y-auto">
          {isLoading ? <p role="status" className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />A carregar notificações…</p> : error ? (
            <div role="alert" className="space-y-3 p-4 text-sm"><p>Não foi possível carregar as notificações.</p><Button size="sm" variant="outline" disabled={isFetching} onClick={() => void refetch()}><RefreshCw className="mr-2 h-4 w-4" aria-hidden />Tentar de novo</Button></div>
          ) : notifications.length === 0 ? (
            <div role="status" className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground"><Bell className="h-8 w-8" aria-hidden /><p className="text-sm">Sem notificações</p></div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const Icone = ICONES[n.type] ?? Info;
                return (
                  <li key={n.id} className={n.read ? '' : 'bg-primary/5'}>
                    <button type="button" className="flex min-h-12 w-full gap-3 p-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-60" onClick={() => void abrir(n)} disabled={!!aAbrir} aria-label={n.related_entity_id && ['task', 'project'].includes(n.related_entity_type ?? '') ? `Abrir ${n.title}` : `Marcar como lida: ${n.title}`}>
                      {aAbrir === n.id ? <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden /> : <Icone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />}
                      <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="break-words text-sm font-medium">{n.title}</span>{!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Por ler" />}</span><span className="mt-1 block break-words text-sm text-muted-foreground">{n.message}</span><span className="mt-2 block text-xs text-muted-foreground">{aAbrir === n.id ? 'A abrir…' : dataRelativa(n.created_at)}</span></span>
                    </button>
                    <div className="flex justify-end gap-1 px-3 pb-2">
                      {!n.read && <Button variant="ghost" size="icon" className="h-9 w-9" disabled={ocupado} aria-label={`Marcar como lida: ${n.title}`} onClick={() => markAsRead.mutate(n.id)}><Check className="h-4 w-4" aria-hidden /></Button>}
                      <Button variant="ghost" size="icon" className="h-9 w-9" disabled={ocupado} aria-label={`Apagar notificação: ${n.title}`} onClick={() => deleteNotification.mutate(n.id)}><Trash2 className="h-4 w-4" aria-hidden /></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
