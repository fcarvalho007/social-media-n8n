import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'deadline' | 'assignment';
  related_entity_type?: string;
  related_entity_id?: string;
  read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryKey = ['notifications', userId];

  const { data: notifications = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!userId,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const exigirUtilizador = () => {
    if (!userId) throw new Error('É necessário entrar para alterar notificações.');
    return userId;
  };
  const invalidar = () => queryClient.invalidateQueries({ queryKey });
  const falhou = () => toast.error('A notificação não foi alterada. Tenta de novo.');

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const dono = exigirUtilizador();
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId).eq('user_id', dono);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: falhou,
  });
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const dono = exigirUtilizador();
      const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', dono).eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => { void invalidar(); toast.success('Notificações marcadas como lidas'); },
    onError: falhou,
  });
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const dono = exigirUtilizador();
      const { error } = await supabase.from('notifications').delete().eq('id', notificationId).eq('user_id', dono);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: falhou,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-changes:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const n = payload.new as Notification;
          if (n.type === 'error') toast.error(n.title, { description: n.message });
          else toast(n.title, { description: n.message });
        }
        void queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  return { notifications, unreadCount, isLoading, isFetching, error, refetch, markAsRead, markAllAsRead, deleteNotification };
};
