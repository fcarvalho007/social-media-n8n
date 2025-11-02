import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: 'pending' | 'achieved' | 'missed';
  created_at: string;
  updated_at: string;
}

export interface TaskMilestone {
  id: string;
  task_id: string;
  milestone_id: string;
  created_at: string;
}

export const useMilestones = (projectId?: string) => {
  const queryClient = useQueryClient();

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: async () => {
      let query = supabase
        .from('milestones')
        .select('*')
        .order('due_date', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Milestone[];
    },
    enabled: !!projectId || projectId === undefined,
  });

  const createMilestone = useMutation({
    mutationFn: async (milestone: Omit<Milestone, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('milestones')
        .insert(milestone)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast.success('Marco criado!');
    },
    onError: (error) => {
      toast.error('Erro ao criar marco');
      console.error(error);
    },
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Milestone> & { id: string }) => {
      const { data, error } = await supabase
        .from('milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast.success('Marco atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar marco');
      console.error(error);
    },
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast.success('Marco eliminado');
    },
    onError: (error) => {
      toast.error('Erro ao eliminar marco');
      console.error(error);
    },
  });

  // Task-Milestone associations
  const { data: taskMilestones = [] } = useQuery({
    queryKey: ['task-milestones', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_milestones')
        .select('*');

      if (error) throw error;
      return data as TaskMilestone[];
    },
  });

  const addTaskToMilestone = useMutation({
    mutationFn: async ({ taskId, milestoneId }: { taskId: string; milestoneId: string }) => {
      const { data, error } = await supabase
        .from('task_milestones')
        .insert({ task_id: taskId, milestone_id: milestoneId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-milestones'] });
      toast.success('Tarefa associada ao marco');
    },
    onError: (error) => {
      toast.error('Erro ao associar tarefa');
      console.error(error);
    },
  });

  const removeTaskFromMilestone = useMutation({
    mutationFn: async ({ taskId, milestoneId }: { taskId: string; milestoneId: string }) => {
      const { error } = await supabase
        .from('task_milestones')
        .delete()
        .eq('task_id', taskId)
        .eq('milestone_id', milestoneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-milestones'] });
      toast.success('Tarefa removida do marco');
    },
    onError: (error) => {
      toast.error('Erro ao remover tarefa');
      console.error(error);
    },
  });

  return {
    milestones,
    isLoading,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    taskMilestones,
    addTaskToMilestone,
    removeTaskFromMilestone,
  };
};
