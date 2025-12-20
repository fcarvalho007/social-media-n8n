import { useState, useCallback, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AIGeneratorForm } from './AIGeneratorForm';
import { AIGeneratorResults } from './AIGeneratorResults';
import { useAIImageGeneration } from '@/hooks/useAIImageGeneration';
import { AIGenerateParams } from '@/lib/ai-generator/types';
import { MediaSource } from '@/types/media';

interface AIGeneratorProps {
  onAddToCarousel: (files: File[], source: MediaSource) => void;
  maxImages: number;
  disabled?: boolean;
}

export function AIGenerator({ onAddToCarousel, maxImages, disabled }: AIGeneratorProps) {
  const [credentialsConfigured, setCredentialsConfigured] = useState<boolean | null>(null);
  const [checkingCredentials, setCheckingCredentials] = useState(true);

  const {
    generate,
    generatedImages,
    isGenerating,
    progress,
    error,
    clearResults,
    toggleImageSelection,
    selectAll,
    deselectAll,
  } = useAIImageGeneration();

  useEffect(() => {
    const checkCredentials = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('ai-generate-image', {
          body: { action: 'ping' },
        });
        if (error?.message?.includes('não configurada') || data?.error?.includes('não configurada')) {
          setCredentialsConfigured(false);
        } else {
          setCredentialsConfigured(true);
        }
      } catch {
        setCredentialsConfigured(true);
      } finally {
        setCheckingCredentials(false);
      }
    };
    checkCredentials();
  }, []);

  const handleGenerate = useCallback((params: AIGenerateParams) => {
    generate(params);
  }, [generate]);

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
        maxImages={maxImages}
      />
    );
  }

  if (isGenerating) {
    const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium">A gerar imagens...</p>
            <p className="text-sm text-muted-foreground">{progress.completed} de {progress.total}</p>
          </div>
        </div>
        <Progress value={percent} className="h-2" />
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
