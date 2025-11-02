import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  structure: {
    tasks: Array<{
      title: string;
      description: string | null;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      estimated_hours: number | null;
      relativeStart: number; // Days from project start
      relativeDuration: number; // Days
    }>;
    milestones: Array<{
      title: string;
      description: string | null;
      relativeDueDate: number; // Days from project start
    }>;
    dependencies: Array<{
      taskIndex: number;
      dependsOnTaskIndex: number;
      type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish';
    }>;
  };
  created_by: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export const useTemplates = () => {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<ProjectTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado');

      const { data, error } = await supabase
        .from('project_templates')
        .insert({ ...template, created_by: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template criado!');
    },
    onError: (error) => {
      toast.error('Erro ao criar template');
      console.error(error);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('project_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar template');
      console.error(error);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template eliminado');
    },
    onError: (error) => {
      toast.error('Erro ao eliminar template');
      console.error(error);
    },
  });

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
};
