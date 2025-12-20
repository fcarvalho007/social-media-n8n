import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  HiggsfieldGenerateParams, 
  HiggsfieldJob, 
  HiggsfieldJobStatus,
  HiggsfieldGeneratedImage,
  HiggsfieldApiResponse
} from '@/lib/higgsfield/types';
import { 
  HIGGSFIELD_POLL_INTERVAL, 
  HIGGSFIELD_TIMEOUT,
  HIGGSFIELD_MAX_RETRIES,
  HIGGSFIELD_MAX_PARALLEL_JOBS
} from '@/lib/higgsfield/constants';

interface UseHiggsfieldGenerationReturn {
  generate: (params: HiggsfieldGenerateParams) => Promise<void>;
  jobs: HiggsfieldJob[];
  generatedImages: HiggsfieldGeneratedImage[];
  isGenerating: boolean;
  progress: { completed: number; total: number; currentStatus: string };
  error: string | null;
  cancelJob: (requestId: string) => void;
  cancelAll: () => void;
  clearResults: () => void;
  toggleImageSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
}

export function useHiggsfieldGeneration(): UseHiggsfieldGenerationReturn {
  const [jobs, setJobs] = useState<HiggsfieldJob[]>([]);
  const [generatedImages, setGeneratedImages] = useState<HiggsfieldGeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const abortController = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pollingIntervals.current.forEach((interval) => clearInterval(interval));
      pollingIntervals.current.clear();
      abortController.current?.abort();
    };
  }, []);

  const callEdgeFunction = async (body: Record<string, unknown>): Promise<HiggsfieldApiResponse> => {
    const { data, error } = await supabase.functions.invoke('higgsfield-generate', {
      body,
    });

    if (error) {
      throw new Error(error.message || 'Erro na chamada à API');
    }

    return data as HiggsfieldApiResponse;
  };

  const updateJobStatus = useCallback((requestId: string, updates: Partial<HiggsfieldJob>) => {
    setJobs((prev) => 
      prev.map((job) => 
        job.requestId === requestId ? { ...job, ...updates } : job
      )
    );
  }, []);

  const pollJobStatus = useCallback(async (job: HiggsfieldJob, retryCount = 0) => {
    try {
      const elapsed = Date.now() - job.startedAt;
      
      // Check timeout
      if (elapsed > HIGGSFIELD_TIMEOUT) {
        updateJobStatus(job.requestId, { 
          status: 'timeout', 
          error: 'Tempo limite excedido (5 minutos)' 
        });
        const interval = pollingIntervals.current.get(job.requestId);
        if (interval) {
          clearInterval(interval);
          pollingIntervals.current.delete(job.requestId);
        }
        return;
      }

      const response = await callEdgeFunction({
        action: 'status',
        requestId: job.requestId,
      });

      if (!response.success) {
        if (retryCount < HIGGSFIELD_MAX_RETRIES) {
          // Retry with exponential backoff
          setTimeout(() => pollJobStatus(job, retryCount + 1), HIGGSFIELD_POLL_INTERVAL * (retryCount + 1));
          return;
        }
        throw new Error(response.error || 'Erro ao verificar status');
      }

      const newStatus = response.status as HiggsfieldJobStatus;
      updateJobStatus(job.requestId, { status: newStatus });

      // If completed, add to generated images
      if (newStatus === 'completed' && response.imageUrl) {
        const interval = pollingIntervals.current.get(job.requestId);
        if (interval) {
          clearInterval(interval);
          pollingIntervals.current.delete(job.requestId);
        }

        updateJobStatus(job.requestId, { 
          status: 'completed', 
          imageUrl: response.imageUrl 
        });

        setGeneratedImages((prev) => [
          ...prev,
          {
            id: job.requestId,
            url: response.imageUrl!,
            selected: true,
            order: prev.length + 1,
          },
        ]);
      }

      // If failed or nsfw, stop polling
      if (newStatus === 'failed' || newStatus === 'nsfw') {
        const interval = pollingIntervals.current.get(job.requestId);
        if (interval) {
          clearInterval(interval);
          pollingIntervals.current.delete(job.requestId);
        }
        
        updateJobStatus(job.requestId, { 
          status: newStatus, 
          error: newStatus === 'nsfw' 
            ? 'Conteúdo bloqueado por filtro de segurança' 
            : response.error || 'Geração falhou'
        });
      }

    } catch (err) {
      console.error('[Higgsfield] Poll error:', err);
      if (retryCount < HIGGSFIELD_MAX_RETRIES) {
        setTimeout(() => pollJobStatus(job, retryCount + 1), HIGGSFIELD_POLL_INTERVAL * (retryCount + 1));
      } else {
        updateJobStatus(job.requestId, { 
          status: 'failed', 
          error: err instanceof Error ? err.message : 'Erro de polling' 
        });
        const interval = pollingIntervals.current.get(job.requestId);
        if (interval) {
          clearInterval(interval);
          pollingIntervals.current.delete(job.requestId);
        }
      }
    }
  }, [updateJobStatus]);

  const startPolling = useCallback((job: HiggsfieldJob) => {
    // Initial poll
    pollJobStatus(job);
    
    // Set up interval
    const interval = setInterval(() => {
      pollJobStatus(job);
    }, HIGGSFIELD_POLL_INTERVAL);
    
    pollingIntervals.current.set(job.requestId, interval);
  }, [pollJobStatus]);

  const generate = useCallback(async (params: HiggsfieldGenerateParams) => {
    setError(null);
    setIsGenerating(true);
    abortController.current = new AbortController();

    const newJobs: HiggsfieldJob[] = [];

    try {
      // Submit jobs with rate limiting (max parallel)
      for (let i = 0; i < params.count; i++) {
        // Wait if we have too many active jobs
        const activeJobs = newJobs.filter(j => 
          j.status === 'pending' || j.status === 'queued' || j.status === 'in_progress'
        );
        
        if (activeJobs.length >= HIGGSFIELD_MAX_PARALLEL_JOBS) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        try {
          const response = await callEdgeFunction({
            action: 'generate',
            prompt: params.prompt,
            model: params.model,
            aspectRatio: params.aspectRatio,
            resolution: params.resolution,
          });

          if (!response.success) {
            throw new Error(response.error || 'Falha ao iniciar geração');
          }

          const job: HiggsfieldJob = {
            id: `job-${i + 1}`,
            requestId: response.requestId!,
            status: 'pending',
            startedAt: Date.now(),
          };

          newJobs.push(job);
          setJobs((prev) => [...prev, job]);
          
          // Start polling for this job
          startPolling(job);

        } catch (err) {
          console.error(`[Higgsfield] Failed to start job ${i + 1}:`, err);
          const failedJob: HiggsfieldJob = {
            id: `job-${i + 1}`,
            requestId: `failed-${Date.now()}-${i}`,
            status: 'failed',
            error: err instanceof Error ? err.message : 'Erro ao iniciar',
            startedAt: Date.now(),
          };
          newJobs.push(failedJob);
          setJobs((prev) => [...prev, failedJob]);
        }

        // Small delay between submissions
        if (i < params.count - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

    } catch (err) {
      console.error('[Higgsfield] Generate error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar imagens');
    }
  }, [startPolling]);

  // Check if all jobs are done
  useEffect(() => {
    if (jobs.length === 0) return;

    const allDone = jobs.every(job => 
      job.status === 'completed' || 
      job.status === 'failed' || 
      job.status === 'nsfw' ||
      job.status === 'timeout' ||
      job.status === 'cancelled'
    );

    if (allDone && isGenerating) {
      setIsGenerating(false);
      
      // Cleanup any remaining intervals
      pollingIntervals.current.forEach((interval) => clearInterval(interval));
      pollingIntervals.current.clear();
    }
  }, [jobs, isGenerating]);

  const cancelJob = useCallback(async (requestId: string) => {
    const interval = pollingIntervals.current.get(requestId);
    if (interval) {
      clearInterval(interval);
      pollingIntervals.current.delete(requestId);
    }

    try {
      await callEdgeFunction({ action: 'cancel', requestId });
    } catch {
      // Ignore cancel errors
    }

    updateJobStatus(requestId, { status: 'cancelled' });
  }, [updateJobStatus]);

  const cancelAll = useCallback(() => {
    abortController.current?.abort();
    
    pollingIntervals.current.forEach((interval) => clearInterval(interval));
    pollingIntervals.current.clear();

    setJobs((prev) => 
      prev.map((job) => 
        job.status === 'pending' || job.status === 'queued' || job.status === 'in_progress'
          ? { ...job, status: 'cancelled' as HiggsfieldJobStatus }
          : job
      )
    );

    setIsGenerating(false);
  }, []);

  const clearResults = useCallback(() => {
    cancelAll();
    setJobs([]);
    setGeneratedImages([]);
    setError(null);
  }, [cancelAll]);

  const toggleImageSelection = useCallback((id: string) => {
    setGeneratedImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, selected: !img.selected } : img
      )
    );
  }, []);

  const selectAll = useCallback(() => {
    setGeneratedImages((prev) => prev.map((img) => ({ ...img, selected: true })));
  }, []);

  const deselectAll = useCallback(() => {
    setGeneratedImages((prev) => prev.map((img) => ({ ...img, selected: false })));
  }, []);

  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const totalCount = jobs.length;
  const currentJob = jobs.find(j => j.status === 'in_progress' || j.status === 'queued' || j.status === 'pending');
  const currentStatus = currentJob 
    ? currentJob.status === 'in_progress' 
      ? 'A gerar...' 
      : 'Em fila...'
    : isGenerating 
      ? 'A submeter...' 
      : '';

  return {
    generate,
    jobs,
    generatedImages,
    isGenerating,
    progress: { 
      completed: completedCount, 
      total: totalCount, 
      currentStatus 
    },
    error,
    cancelJob,
    cancelAll,
    clearResults,
    toggleImageSelection,
    selectAll,
    deselectAll,
  };
}
