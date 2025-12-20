import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  AIGenerateParams, 
  AIGenerationJob, 
  AIGeneratedImage 
} from '@/lib/ai-generator/types';

interface UseAIImageGenerationReturn {
  generate: (params: AIGenerateParams) => Promise<void>;
  jobs: AIGenerationJob[];
  generatedImages: AIGeneratedImage[];
  isGenerating: boolean;
  progress: { completed: number; total: number; currentStatus: string };
  error: string | null;
  clearResults: () => void;
  toggleImageSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
}

export function useAIImageGeneration(): UseAIImageGenerationReturn {
  const [jobs, setJobs] = useState<AIGenerationJob[]>([]);
  const [generatedImages, setGeneratedImages] = useState<AIGeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (params: AIGenerateParams) => {
    setError(null);
    setIsGenerating(true);
    setJobs([]);
    setGeneratedImages([]);

    const newJobs: AIGenerationJob[] = [];
    const newImages: AIGeneratedImage[] = [];

    // Get model string from model id
    const modelMap: Record<string, string> = {
      'nano-banana-pro': 'google/gemini-2.5-flash-image-preview',
      'gpt-image': 'google/gemini-3-pro-image-preview',
    };
    const modelString = modelMap[params.model] || 'google/gemini-2.5-flash-image-preview';

    try {
      for (let i = 0; i < params.count; i++) {
        const jobId = `job-${Date.now()}-${i}`;
        
        // Add pending job
        const pendingJob: AIGenerationJob = {
          id: jobId,
          status: 'pending',
          startedAt: Date.now(),
        };
        newJobs.push(pendingJob);
        setJobs([...newJobs]);

        try {
          // Update to generating
          newJobs[i] = { ...newJobs[i], status: 'generating' };
          setJobs([...newJobs]);

          const { data, error: fnError } = await supabase.functions.invoke('ai-generate-image', {
            body: {
              action: 'generate',
              prompt: params.prompt,
              model: modelString,
              aspectRatio: params.aspectRatio,
            },
          });

          if (fnError) {
            throw new Error(fnError.message || 'Erro ao gerar imagem');
          }

          if (!data?.success) {
            throw new Error(data?.error || 'Erro desconhecido');
          }

          // Success - add image
          newJobs[i] = { 
            ...newJobs[i], 
            status: 'completed',
            imageUrl: data.imageUrl 
          };
          setJobs([...newJobs]);

          const newImage: AIGeneratedImage = {
            id: jobId,
            url: data.imageUrl,
            selected: true,
            order: newImages.length + 1,
          };
          newImages.push(newImage);
          setGeneratedImages([...newImages]);

        } catch (err) {
          console.error(`[AI Generate] Job ${i + 1} failed:`, err);
          newJobs[i] = { 
            ...newJobs[i], 
            status: 'failed',
            error: err instanceof Error ? err.message : 'Erro ao gerar' 
          };
          setJobs([...newJobs]);
        }

        // Small delay between requests
        if (i < params.count - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

    } catch (err) {
      console.error('[AI Generate] Error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar imagens');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setJobs([]);
    setGeneratedImages([]);
    setError(null);
  }, []);

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
  const currentJob = jobs.find(j => j.status === 'generating' || j.status === 'pending');
  const currentStatus = currentJob 
    ? currentJob.status === 'generating' 
      ? 'A gerar...' 
      : 'Em fila...'
    : isGenerating 
      ? 'A preparar...' 
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
    clearResults,
    toggleImageSelection,
    selectAll,
    deselectAll,
  };
}
