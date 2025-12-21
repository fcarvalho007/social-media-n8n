import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  AIGenerateParams, 
  AIGenerationJob, 
  AIGeneratedImage 
} from '@/lib/ai-generator/types';
import { 
  calculateNanoBananaCost, 
  calculateGPTImageCost 
} from '@/lib/ai-generator/constants';

interface UseAIImageGenerationReturn {
  generate: (params: AIGenerateParams) => Promise<void>;
  jobs: AIGenerationJob[];
  generatedImages: AIGeneratedImage[];
  isGenerating: boolean;
  progress: { completed: number; total: number; currentStatus: string };
  error: string | null;
  totalCost: number;
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
  const [totalCost, setTotalCost] = useState(0);

  const generate = useCallback(async (params: AIGenerateParams) => {
    setError(null);
    setIsGenerating(true);
    setJobs([]);
    setGeneratedImages([]);
    setTotalCost(0);

    const newJobs: AIGenerationJob[] = [];
    const newImages: AIGeneratedImage[] = [];
    let accumulatedCost = 0;

    // Always use fal-generate-image since both models are on fal.ai
    const edgeFunction = 'fal-generate-image';
    const isNanoBanana = params.model === 'nano-banana-pro';

    console.log(`[AI Generate] Model: ${params.model}, Edge function: ${edgeFunction}`);

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

          // Build request body based on model
          const body = isNanoBanana 
            ? {
                action: 'generate',
                modelId: 'nano-banana-pro',
                prompt: params.prompt,
                aspectRatio: params.aspectRatio || '1:1',
                resolution: params.resolution || '1K',
              }
            : {
                action: 'generate',
                modelId: 'gpt-image-1.5',
                prompt: params.prompt,
                imageSize: params.imageSize || '1024x1024',
                quality: params.quality || 'high',
              };

          console.log(`[AI Generate] Request body:`, body);

          const { data, error: fnError } = await supabase.functions.invoke(edgeFunction, {
            body,
          });

          if (fnError) {
            throw new Error(fnError.message || 'Erro ao gerar imagem');
          }

          if (!data?.success) {
            throw new Error(data?.error || 'Erro desconhecido');
          }

          // Get cost from response or calculate it
          const imageCost = data.cost || (isNanoBanana 
            ? calculateNanoBananaCost(params.resolution || '1K', 1)
            : calculateGPTImageCost(params.quality || 'high', params.imageSize || '1024x1024', 1)
          );
          
          accumulatedCost += imageCost;
          setTotalCost(accumulatedCost);

          // Success - add image
          newJobs[i] = { 
            ...newJobs[i], 
            status: 'completed',
            imageUrl: data.imageUrl,
            cost: imageCost,
          };
          setJobs([...newJobs]);

          const newImage: AIGeneratedImage = {
            id: jobId,
            url: data.imageUrl,
            selected: true,
            order: newImages.length + 1,
            cost: imageCost,
          };
          newImages.push(newImage);
          setGeneratedImages([...newImages]);

          console.log(`[AI Generate] Image ${i + 1} generated. Cost: $${imageCost.toFixed(3)}`);

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
    setTotalCost(0);
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
    totalCost,
    clearResults,
    toggleImageSelection,
    selectAll,
    deselectAll,
  };
}
