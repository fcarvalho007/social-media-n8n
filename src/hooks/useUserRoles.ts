import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AppRole = 'admin' | 'editor' | 'viewer';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export const useUserRoles = (userId?: string) => {
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      const query = supabase
        .from('user_roles')
        .select('*');

      if (userId) {
        query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as UserRole[];
    },
    enabled: !!userId,
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast.success('Role adicionada com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar role');
    },
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast.success('Role removida com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover role');
    },
  });

  return {
    roles,
    isLoading,
    addRole: addRole.mutate,
    removeRole: removeRole.mutate,
  };
};

export const useCurrentUserRoles = () => {
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['current-user-roles', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      if (error) throw error;
      return data.map((r) => r.role) as AppRole[];
    },
    enabled: !!session?.user?.id,
  });

  const isAdmin = roles.includes('admin');
  const isEditor = roles.includes('editor');
  const isViewer = roles.includes('viewer');

  return {
    roles,
    isLoading,
    isAdmin,
    isEditor,
    isViewer,
  };
};
