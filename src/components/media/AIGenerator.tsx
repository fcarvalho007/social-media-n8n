import { useState, useCallback, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AIGeneratorForm } from './AIGeneratorForm';
import { AIGeneratorProgress } from './AIGeneratorProgress';
import { AIGeneratorResults } from './AIGeneratorResults';
import { AIImageHistory } from './AIImageHistory';
import { QuickCropToInstagram } from './QuickCropToInstagram';
import { useAIImageGeneration } from '@/hooks/useAIImageGeneration';
import { useAIImageHistory } from '@/hooks/useAIImageHistory';
import { AIGenerateParams } from '@/lib/ai-generator/types';
import { getModelById, calculateNanoBananaCost, calculateGPTImageCost } from '@/lib/ai-generator/constants';
import { MediaSource } from '@/types/media';

interface AIGeneratorProps {
  onAddToCarousel: (files: File[], source: MediaSource) => void;
  onSendToGridSplitter?: (imageFile: File, presetConfig?: { rows: number; cols: number }) => void;
  maxImages: number;
  disabled?: boolean;
}

export function AIGenerator({ onAddToCarousel, onSendToGridSplitter, maxImages, disabled }: AIGeneratorProps) {
  const [credentialsConfigured, setCredentialsConfigured] = useState<boolean | null>(null);
  const [checkingCredentials, setCheckingCredentials] = useState(true);
  const [currentParams, setCurrentParams] = useState<AIGenerateParams | null>(null);
  const [quickCropImage, setQuickCropImage] = useState<string | null>(null);
  const [isProcessingCrop, setIsProcessingCrop] = useState(false);

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

  const {
    historyImages,
    isLoading: isLoadingHistory,
    saveToHistory,
    deleteFromHistory,
    refreshHistory,
  } = useAIImageHistory();

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

  // Auto-save generated images to history
  useEffect(() => {
    const saveNewImages = async () => {
      if (!isGenerating && generatedImages.length > 0 && currentParams) {
        for (const img of generatedImages) {
          await saveToHistory(img.url, currentParams.prompt, img.cost);
        }
      }
    };
    saveNewImages();
  }, [isGenerating, generatedImages.length]);

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
    // Open quick crop dialog instead of sending directly
    setQuickCropImage(imageUrl);
  }, []);

  const handleQuickCrop = useCallback(async (rows: number, cols: number) => {
    if (!quickCropImage || !onSendToGridSplitter) return;
    
    setIsProcessingCrop(true);
    try {
      const response = await fetch(quickCropImage);
      const blob = await response.blob();
      const file = new File([blob], `ai-generated-grid-${Date.now()}.png`, { type: 'image/png' });
      onSendToGridSplitter(file, { rows, cols });
      clearResults();
      setQuickCropImage(null);
    } catch (err) {
      console.error('Error sending to grid splitter:', err);
      toast.error('Erro ao processar imagem');
    } finally {
      setIsProcessingCrop(false);
    }
  }, [quickCropImage, onSendToGridSplitter, clearResults]);

  const handleAddDirect = useCallback(async () => {
    if (!quickCropImage) return;
    
    setIsProcessingCrop(true);
    try {
      const response = await fetch(quickCropImage);
      const blob = await response.blob();
      const file = new File([blob], `ai-generated-${Date.now()}.png`, { type: 'image/png' });
      onAddToCarousel([file], 'ai');
      clearResults();
      setQuickCropImage(null);
    } catch (err) {
      console.error('Error adding image:', err);
      toast.error('Erro ao adicionar imagem');
    } finally {
      setIsProcessingCrop(false);
    }
  }, [quickCropImage, onAddToCarousel, clearResults]);

  // History handlers
  const handleHistoryUseImage = useCallback(async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `history-${Date.now()}.png`, { type: 'image/png' });
      onAddToCarousel([file], 'ai');
      toast.success('Imagem adicionada ao carrossel');
    } catch (err) {
      console.error('Error using history image:', err);
      toast.error('Erro ao usar imagem');
    }
  }, [onAddToCarousel]);

  const handleHistoryCropImage = useCallback(async (imageUrl: string) => {
    setQuickCropImage(imageUrl);
  }, []);

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
        
        {/* Show history even on error */}
        {historyImages.length > 0 && (
          <>
            <Separator />
            <AIImageHistory
              images={historyImages}
              isLoading={isLoadingHistory}
              onUseImage={handleHistoryUseImage}
              onCropImage={handleHistoryCropImage}
              onDeleteImage={deleteFromHistory}
            />
          </>
        )}
      </div>
    );
  }

  if (generatedImages.length > 0 && !isGenerating) {
    return (
      <>
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
        
        {/* Quick Crop Dialog */}
        {quickCropImage && (
          <QuickCropToInstagram
            imageUrl={quickCropImage}
            open={!!quickCropImage}
            onOpenChange={(open) => !open && setQuickCropImage(null)}
            onCrop={handleQuickCrop}
            onAddDirect={handleAddDirect}
            isProcessing={isProcessingCrop}
          />
        )}
      </>
    );
  }

  if (isGenerating) {
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

  return (
    <div className="space-y-4">
      <AIGeneratorForm onGenerate={handleGenerate} disabled={disabled} />
      
      {/* History Section */}
      {historyImages.length > 0 && (
        <>
          <Separator />
          <AIImageHistory
            images={historyImages}
            isLoading={isLoadingHistory}
            onUseImage={handleHistoryUseImage}
            onCropImage={handleHistoryCropImage}
            onDeleteImage={deleteFromHistory}
          />
        </>
      )}
      
      {/* Quick Crop Dialog */}
      {quickCropImage && (
        <QuickCropToInstagram
          imageUrl={quickCropImage}
          open={!!quickCropImage}
          onOpenChange={(open) => !open && setQuickCropImage(null)}
          onCrop={handleQuickCrop}
          onAddDirect={handleAddDirect}
          isProcessing={isProcessingCrop}
        />
      )}
    </div>
  );
}
