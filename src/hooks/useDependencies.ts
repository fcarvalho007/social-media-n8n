import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish';
  created_at: string;
}

export const useDependencies = (taskId?: string) => {
  const queryClient = useQueryClient();

  const { data: dependencies = [], isLoading } = useQuery({
    queryKey: ['dependencies', taskId],
    queryFn: async () => {
      let query = supabase
        .from('task_dependencies')
        .select('*')
        .order('created_at', { ascending: false });

      if (taskId) {
        query = query.eq('task_id', taskId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TaskDependency[];
    },
    enabled: !!taskId || taskId === undefined,
  });

  // Check for circular dependencies
  const checkCircularDependency = async (taskId: string, dependsOnTaskId: string): Promise<boolean> => {
    const visited = new Set<string>();
    
    const checkPath = async (currentTaskId: string): Promise<boolean> => {
      if (currentTaskId === taskId) return true; // Cycle found
      if (visited.has(currentTaskId)) return false;
      
      visited.add(currentTaskId);
      
      const { data } = await supabase
        .from('task_dependencies')
        .select('depends_on_task_id')
        .eq('task_id', currentTaskId);
      
      if (!data) return false;
      
      for (const dep of data) {
        if (await checkPath(dep.depends_on_task_id)) return true;
      }
      
      return false;
    };
    
    return checkPath(dependsOnTaskId);
  };

  const createDependency = useMutation({
    mutationFn: async (dependency: Omit<TaskDependency, 'id' | 'created_at'>) => {
      // Check for circular dependency
      const wouldCreateCycle = await checkCircularDependency(
        dependency.task_id,
        dependency.depends_on_task_id
      );

      if (wouldCreateCycle) {
        throw new Error('Não é possível criar esta dependência. Criaria um ciclo.');
      }

      const { data, error } = await supabase
        .from('task_dependencies')
        .insert(dependency)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencies'] });
      toast.success('Dependência criada!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar dependência');
      console.error(error);
    },
  });

  const deleteDependency = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencies'] });
      toast.success('Dependência removida');
    },
    onError: (error) => {
      toast.error('Erro ao remover dependência');
      console.error(error);
    },
  });

  return {
    dependencies,
    isLoading,
    createDependency,
    deleteDependency,
    checkCircularDependency,
  };
};
