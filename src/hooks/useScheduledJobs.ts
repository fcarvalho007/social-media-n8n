import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ScheduledJob {
  id: string;
  post_id: string | null;
  story_id: string | null;
  job_type: 'post' | 'story';
  scheduled_for: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'requires_attention';
  attempts: number;
  max_attempts: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  error_message: string | null;
  error_log: Array<{ attempt: number; timestamp: string; error: string }>;
  completed_at: string | null;
  created_at: string;
  // Joined data
  post?: {
    id: string;
    tema: string;
    status: string;
    selected_networks: string[];
  };
  story?: {
    id: string;
    tema: string;
    status: string;
  };
}

export function useScheduledJobs() {
  const queryClient = useQueryClient();

  // Fetch all pending/failed jobs
  const { data: pendingJobs = [], isLoading: loadingPending } = useQuery({
    queryKey: ['scheduled-jobs', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_jobs')
        .select(`
          *,
          post:posts(id, tema, status, selected_networks),
          story:stories(id, tema, status)
        `)
        .in('status', ['pending', 'processing', 'failed'])
        .order('scheduled_for', { ascending: true })
        .limit(50);

      if (error) throw error;
      return data as unknown as ScheduledJob[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch jobs requiring attention
  const { data: attentionJobs = [], isLoading: loadingAttention } = useQuery({
    queryKey: ['scheduled-jobs', 'attention'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_jobs')
        .select(`
          *,
          post:posts(id, tema, status, selected_networks),
          story:stories(id, tema, status)
        `)
        .eq('status', 'requires_attention')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as unknown as ScheduledJob[];
    },
  });

  // Fetch upcoming jobs (next 24 hours)
  const { data: upcomingJobs = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ['scheduled-jobs', 'upcoming'],
    queryFn: async () => {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('scheduled_jobs')
        .select(`
          *,
          post:posts(id, tema, status, selected_networks),
          story:stories(id, tema, status)
        `)
        .eq('status', 'pending')
        .gte('scheduled_for', now.toISOString())
        .lte('scheduled_for', in24Hours.toISOString())
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return data as unknown as ScheduledJob[];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Cancel a scheduled job
  const cancelJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('scheduled_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] });
      toast.success('Agendamento cancelado');
    },
    onError: (error) => {
      toast.error('Erro ao cancelar agendamento');
      console.error(error);
    },
  });

  // Retry a failed job
  const retryJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('scheduled_jobs')
        .update({ 
          status: 'pending',
          attempts: 0,
          error_message: null,
          next_retry_at: null,
        })
        .eq('id', jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] });
      toast.success('Agendamento reiniciado');
    },
    onError: (error) => {
      toast.error('Erro ao reiniciar agendamento');
      console.error(error);
    },
  });

  // Get stats
  const stats = {
    pending: pendingJobs.filter(j => j.status === 'pending').length,
    processing: pendingJobs.filter(j => j.status === 'processing').length,
    failed: pendingJobs.filter(j => j.status === 'failed').length,
    requiresAttention: attentionJobs.length,
    upcomingCount: upcomingJobs.length,
  };

  return {
    pendingJobs,
    attentionJobs,
    upcomingJobs,
    stats,
    isLoading: loadingPending || loadingAttention || loadingUpcoming,
    cancelJob,
    retryJob,
  };
}
