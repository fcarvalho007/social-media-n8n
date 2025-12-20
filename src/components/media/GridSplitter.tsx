import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Grid3x3, Upload, Sparkles, Loader2, AlertTriangle, ChevronDown, Plus, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GridControls } from './GridControls';
import { GridPreview } from './GridPreview';
import { AIGenerator } from './AIGenerator';
import { useGridDetection } from '@/hooks/useGridDetection';
import { DetectedImage, GridConfig, GridDetectionProgress } from '@/types/grid-splitter';

interface GridSplitterProps {
  onAddToCarousel: (files: File[]) => void;
  maxImages: number;
  disabled?: boolean;
}

export function GridSplitter({ onAddToCarousel, maxImages, disabled = false }: GridSplitterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'grid' | 'ai'>('grid');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [detectedImages, setDetectedImages] = useState<DetectedImage[]>([]);
  const [detectionMode, setDetectionMode] = useState<'auto' | 'manual'>('manual');
  const [manualConfig, setManualConfig] = useState<GridConfig>({ rows: 2, cols: 2 });
  const [sensitivity, setSensitivity] = useState(50);
  const [removeBorders, setRemoveBorders] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { processGrid, isProcessing, progress } = useGridDetection();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG ou WebP.');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Ficheiro muito grande. Máximo 50MB.');
      return;
    }

    // Clean up previous URL
    if (uploadedImageUrl) {
      URL.revokeObjectURL(uploadedImageUrl);
    }

    const url = URL.createObjectURL(file);
    setUploadedImage(file);
    setUploadedImageUrl(url);
    setDetectedImages([]);
    setError(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadedImageUrl]);

  const handleProcessGrid = useCallback(async () => {
    if (!uploadedImage) return;

    setError(null);
    
    try {
      const images = await processGrid(
        uploadedImage,
        detectionMode,
        manualConfig,
        sensitivity,
        removeBorders
      );
      
      setDetectedImages(images);
      toast.success(`${images.length} imagens detectadas!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar grelha';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, [uploadedImage, detectionMode, manualConfig, sensitivity, removeBorders, processGrid]);

  const handleAddToCarousel = useCallback(async () => {
    const selectedImages = detectedImages.filter((img) => img.selected);
    
    if (selectedImages.length === 0) {
      toast.error('Selecione pelo menos uma imagem');
      return;
    }

    if (selectedImages.length > maxImages) {
      toast.error(`Máximo de ${maxImages} imagens permitidas`);
      return;
    }

    // Convert blobs to Files
    const files = selectedImages.map((img, idx) => {
      return new File([img.blob], `grid-image-${idx + 1}.jpg`, { type: 'image/jpeg' });
    });

    onAddToCarousel(files);
    
    // Reset state
    if (uploadedImageUrl) {
      URL.revokeObjectURL(uploadedImageUrl);
    }
    setUploadedImage(null);
    setUploadedImageUrl(null);
    setDetectedImages([]);
    setError(null);
    setIsOpen(false);
    
    toast.success(`${files.length} imagens adicionadas ao carrossel`);
  }, [detectedImages, maxImages, onAddToCarousel, uploadedImageUrl]);

  const handleClearImage = useCallback(() => {
    if (uploadedImageUrl) {
      URL.revokeObjectURL(uploadedImageUrl);
    }
    setUploadedImage(null);
    setUploadedImageUrl(null);
    setDetectedImages([]);
    setError(null);
  }, [uploadedImageUrl]);

  const selectedCount = detectedImages.filter((img) => img.selected).length;
  const canAddToCarousel = selectedCount > 0 && selectedCount <= maxImages;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-between p-4 h-auto",
            "border border-dashed rounded-xl",
            "hover:border-primary/50 hover:bg-primary/5",
            isOpen && "border-primary/50 bg-primary/5"
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Grid3x3 className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium">Importar Imagens</p>
              <p className="text-xs text-muted-foreground">
                Carregar grelha ou gerar com IA
              </p>
            </div>
          </div>
          <ChevronDown className={cn(
            "h-5 w-5 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3">
        <div className="border rounded-xl bg-card overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'grid' | 'ai')}>
            <TabsList className="w-full rounded-none border-b bg-muted/30">
              <TabsTrigger value="grid" className="flex-1 gap-2">
                <Upload className="h-4 w-4" />
                Carregar Grelha
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex-1 gap-2">
                <Wand2 className="h-4 w-4" />
                Gerar com IA
              </TabsTrigger>
            </TabsList>

            {/* Grid Upload Tab */}
            <TabsContent value="grid" className="p-4 space-y-4 mt-0">
              {/* Upload Area */}
              {!uploadedImage ? (
                <label
                  htmlFor="grid-upload"
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 p-8",
                    "border-2 border-dashed rounded-xl cursor-pointer",
                    "hover:border-primary/50 hover:bg-primary/5 transition-all",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="p-3 rounded-full bg-primary/10">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Carregar Grelha</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG ou WebP até 50MB</p>
                  </div>
                  <Input
                    ref={fileInputRef}
                    id="grid-upload"
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={handleFileSelect}
                    disabled={disabled}
                    className="hidden"
                  />
                </label>
              ) : (
                <>
                  {/* Image Preview with Grid Overlay */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Imagem carregada</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearImage}
                        disabled={isProcessing}
                        className="h-7 text-xs text-destructive hover:text-destructive"
                      >
                        Remover
                      </Button>
                    </div>
                    
                    <GridPreview
                      uploadedImageUrl={uploadedImageUrl}
                      manualConfig={manualConfig}
                      detectedImages={detectedImages}
                      onImagesChange={setDetectedImages}
                      disabled={disabled || isProcessing}
                    />
                  </div>

                  {/* Controls */}
                  {detectedImages.length === 0 && (
                    <>
                      <Separator />
                      
                      <GridControls
                        detectionMode={detectionMode}
                        onDetectionModeChange={setDetectionMode}
                        manualConfig={manualConfig}
                        onManualConfigChange={setManualConfig}
                        sensitivity={sensitivity}
                        onSensitivityChange={setSensitivity}
                        removeBorders={removeBorders}
                        onRemoveBordersChange={setRemoveBorders}
                        disabled={disabled || isProcessing}
                      />

                      {/* Process Button */}
                      <Button
                        onClick={handleProcessGrid}
                        disabled={disabled || isProcessing || !uploadedImage}
                        className="w-full"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            A processar...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            {detectionMode === 'auto' ? 'Detetar Grelha' : 'Processar Grelha'}
                          </>
                        )}
                      </Button>

                      {/* Progress Bar */}
                      {isProcessing && progress && (
                        <div className="space-y-2">
                          <Progress value={progress.percent} className="h-2" />
                          <p className="text-xs text-muted-foreground text-center">
                            {progress.message}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Error Message */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Add to Carousel Button */}
                  {detectedImages.length > 0 && (
                    <>
                      <Separator />
                      
                      <div className="flex flex-col gap-2">
                        {maxImages < selectedCount && (
                          <p className="text-xs text-destructive text-center">
                            Limite de {maxImages} imagens. Desselecione algumas.
                          </p>
                        )}
                        
                        <Button
                          onClick={handleAddToCarousel}
                          disabled={disabled || !canAddToCarousel}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar {selectedCount} ao Carrossel
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearImage}
                          disabled={isProcessing}
                          className="w-full"
                        >
                          Começar de novo
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </TabsContent>

            {/* AI Generator Tab */}
            <TabsContent value="ai" className="p-4 mt-0">
              <AIGenerator
                onAddToCarousel={(files) => {
                  onAddToCarousel(files);
                  setIsOpen(false);
                }}
                maxImages={maxImages}
                disabled={disabled}
              />
            </TabsContent>
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
