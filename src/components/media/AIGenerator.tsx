import { useState, useCallback, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AIGeneratorForm } from './AIGeneratorForm';
import { AIGeneratorProgress } from './AIGeneratorProgress';
import { AIGeneratorResults } from './AIGeneratorResults';
import { useAIImageGeneration } from '@/hooks/useAIImageGeneration';
import { AIGenerateParams } from '@/lib/ai-generator/types';
import { getModelById, calculateNanoBananaCost, calculateGPTImageCost } from '@/lib/ai-generator/constants';
import { MediaSource } from '@/types/media';

interface AIGeneratorProps {
  onAddToCarousel: (files: File[], source: MediaSource) => void;
  onSendToGridSplitter?: (imageFile: File) => void;
  maxImages: number;
  disabled?: boolean;
}

export function AIGenerator({ onAddToCarousel, onSendToGridSplitter, maxImages, disabled }: AIGeneratorProps) {
  const [credentialsConfigured, setCredentialsConfigured] = useState<boolean | null>(null);
  const [checkingCredentials, setCheckingCredentials] = useState(true);

  const [currentParams, setCurrentParams] = useState<AIGenerateParams | null>(null);

  const {
    generate,
    jobs,
    generatedImages,
    isGenerating,
    progress,
    error,
    totalCost,
    clearResults,
    toggleImageSelection,
    selectAll,
    deselectAll,
  } = useAIImageGeneration();

  useEffect(() => {
    const checkCredentials = async () => {
      try {
        // Check Lovable AI (free model)
        const { data, error } = await supabase.functions.invoke('ai-generate-image', {
          body: { action: 'ping' },
        });
        
        if (error?.message?.includes('não configurada') || data?.error?.includes('não configurada')) {
          setCredentialsConfigured(false);
        } else {
          setCredentialsConfigured(true);
        }
      } catch {
        // If ping fails, still show the form (fal.ai might work)
        setCredentialsConfigured(true);
      } finally {
        setCheckingCredentials(false);
      }
    };
    checkCredentials();
  }, []);

  const handleGenerate = useCallback((params: AIGenerateParams) => {
    setCurrentParams(params);
    generate(params);
  }, [generate]);

  const handleCancelGeneration = useCallback(() => {
    clearResults();
    setCurrentParams(null);
  }, [clearResults]);

  const handleAddToCarousel = useCallback(async () => {
    const selectedImages = generatedImages.filter(img => img.selected);
    if (selectedImages.length === 0) return;

    const files: File[] = [];
    for (const img of selectedImages) {
      try {
        const response = await fetch(img.url);
        const blob = await response.blob();
        const file = new File([blob], `ai-generated-${img.id}.png`, { type: 'image/png' });
        files.push(file);
      } catch (err) {
        console.error('Error converting image:', err);
      }
    }

    if (files.length > 0) {
      onAddToCarousel(files, 'ai');
      clearResults();
    }
  }, [generatedImages, onAddToCarousel, clearResults]);

  const handleSendToGridSplitter = useCallback(async (imageUrl: string) => {
    if (!onSendToGridSplitter) return;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `ai-generated-grid-${Date.now()}.png`, { type: 'image/png' });
      onSendToGridSplitter(file);
      clearResults();
    } catch (err) {
      console.error('Error sending to grid splitter:', err);
    }
  }, [onSendToGridSplitter, clearResults]);

  if (checkingCredentials) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (credentialsConfigured === false) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          O gerador de imagens com IA não está configurado. Contacta o suporte.
        </AlertDescription>
      </Alert>
    );
  }

  if (error && !isGenerating && generatedImages.length === 0) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={clearResults} className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (generatedImages.length > 0 && !isGenerating) {
    return (
      <AIGeneratorResults
        images={generatedImages}
        onToggleSelection={toggleImageSelection}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onAddToCarousel={handleAddToCarousel}
        onGenerateNew={clearResults}
        onSendToGridSplitter={onSendToGridSplitter ? handleSendToGridSplitter : undefined}
        maxImages={maxImages}
        totalCost={totalCost}
      />
    );
  }

  if (isGenerating) {
    // Calculate estimated cost per image for display
    const estimatedCostPerImage = currentParams 
      ? currentParams.model === 'nano-banana-pro'
        ? calculateNanoBananaCost(currentParams.resolution || '2K', 1)
        : calculateGPTImageCost(currentParams.quality || 'high', currentParams.imageSize || '1024x1024', 1)
      : 0.15;
    
    const modelName = currentParams 
      ? getModelById(currentParams.model)?.name || 'AI'
      : 'AI';

    return (
      <div className="space-y-4">
        <AIGeneratorProgress
          jobs={jobs}
          progress={progress}
          onCancel={handleCancelGeneration}
          modelName={modelName}
          estimatedCostPerImage={estimatedCostPerImage}
        />
        {generatedImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {generatedImages.map((img) => (
              <div key={img.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={img.url} alt="Generated" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <AIGeneratorForm onGenerate={handleGenerate} disabled={disabled} />;
}
