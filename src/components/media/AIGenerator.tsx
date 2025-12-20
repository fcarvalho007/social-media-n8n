import { useCallback, useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AIGeneratorForm } from './AIGeneratorForm';
import { AIGeneratorProgress } from './AIGeneratorProgress';
import { AIGeneratorResults } from './AIGeneratorResults';
import { useHiggsfieldGeneration } from '@/hooks/useHiggsfieldGeneration';
import { HiggsfieldGenerateParams, HiggsfieldGeneratedImage } from '@/lib/higgsfield/types';

interface AIGeneratorProps {
  onAddToCarousel: (files: File[]) => void;
  maxImages: number;
  disabled?: boolean;
}

export function AIGenerator({ onAddToCarousel, maxImages, disabled = false }: AIGeneratorProps) {
  const [credentialsConfigured, setCredentialsConfigured] = useState<boolean | null>(null);
  const [checkingCredentials, setCheckingCredentials] = useState(true);

  const {
    generate,
    jobs,
    generatedImages,
    isGenerating,
    progress,
    error,
    cancelAll,
    cancelJob,
    clearResults,
    toggleImageSelection,
    selectAll,
    deselectAll,
  } = useHiggsfieldGeneration();

  // Check if credentials are configured on mount
  useEffect(() => {
    const checkCredentials = async () => {
      try {
        // Use a ping action to verify credentials are configured
        const { data, error } = await supabase.functions.invoke('higgsfield-generate', {
          body: { action: 'ping' },
        });

        // If we get an error about missing credentials, they're not configured
        if (error?.message?.includes('não configuradas') || data?.error?.includes('não configuradas')) {
          setCredentialsConfigured(false);
        } else {
          setCredentialsConfigured(true);
        }
      } catch {
        // Assume configured if we can't check
        setCredentialsConfigured(true);
      } finally {
        setCheckingCredentials(false);
      }
    };

    checkCredentials();
  }, []);

  const handleGenerate = useCallback(async (params: HiggsfieldGenerateParams) => {
    try {
      await generate(params);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar imagens');
    }
  }, [generate]);

  const handleAddToCarousel = useCallback(async (images: HiggsfieldGeneratedImage[]) => {
    try {
      // Convert image URLs to Files
      const files: File[] = [];
      
      for (const image of images) {
        const response = await fetch(image.url);
        const blob = await response.blob();
        const file = new File([blob], `ai-generated-${image.order}.jpg`, { type: 'image/jpeg' });
        files.push(file);
      }

      onAddToCarousel(files);
      clearResults();
      toast.success(`${files.length} imagens adicionadas ao carrossel`);
    } catch (err) {
      toast.error('Erro ao adicionar imagens ao carrossel');
      console.error('[AIGenerator] Add to carousel error:', err);
    }
  }, [onAddToCarousel, clearResults]);

  // Loading state
  if (checkingCredentials) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // Credentials not configured
  if (credentialsConfigured === false) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex flex-col gap-2">
          <p>
            As credenciais da Higgsfield AI não estão configuradas. 
            Configure <code className="bg-muted px-1 rounded">HF_API_KEY</code> e{' '}
            <code className="bg-muted px-1 rounded">HF_API_SECRET</code> nas variáveis de ambiente.
          </p>
          <Button variant="outline" size="sm" asChild className="w-fit">
            <a 
              href="https://platform.higgsfield.ai" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Obter Credenciais
            </a>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Error state
  if (error && !isGenerating && jobs.length === 0) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={clearResults} className="w-full">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  // Results view
  if (generatedImages.length > 0 && !isGenerating) {
    return (
      <AIGeneratorResults
        images={generatedImages}
        onToggleSelection={toggleImageSelection}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onAddToCarousel={handleAddToCarousel}
        onStartOver={clearResults}
        maxImages={maxImages}
        disabled={disabled}
      />
    );
  }

  // Progress view
  if (isGenerating || jobs.length > 0) {
    return (
      <div className="space-y-4">
        <AIGeneratorProgress
          jobs={jobs}
          progress={progress}
          onCancel={cancelAll}
          onCancelJob={cancelJob}
        />
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // Form view (default)
  return (
    <AIGeneratorForm
      onGenerate={handleGenerate}
      disabled={disabled || isGenerating}
    />
  );
}
