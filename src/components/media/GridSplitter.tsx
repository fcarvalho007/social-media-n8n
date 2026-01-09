import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Grid3x3, Upload, Sparkles, Loader2, AlertTriangle, ChevronDown, Plus, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GridControls } from './GridControls';
import { GridPreview } from './GridPreview';
import { AIGenerator } from './AIGenerator';
import { useGridDetection } from '@/hooks/useGridDetection';
import { DetectedImage, GridConfig, GridDetectionProgress } from '@/types/grid-splitter';
import { PostFormat } from '@/types/social';
import { VIDEO_ONLY_FORMATS } from '@/lib/ai-generator/constants';
import { MediaSource } from '@/types/media';

interface GridSplitterProps {
  onAddToCarousel: (files: File[], source: MediaSource) => void;
  maxImages: number;
  disabled?: boolean;
  selectedFormats?: PostFormat[];
  // Allow external control to open with a preset image and config
  externalImage?: File | null;
  externalConfig?: { rows: number; cols: number } | null;
  onExternalImageProcessed?: () => void;
  /** When true, renders only the grid content without the outer collapsible wrapper and tabs */
  isEmbedded?: boolean;
}

export function GridSplitter({ 
  onAddToCarousel, 
  maxImages, 
  disabled = false, 
  selectedFormats = [],
  externalImage,
  externalConfig,
  onExternalImageProcessed,
  isEmbedded = false,
}: GridSplitterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'grid' | 'ai'>('grid');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [detectedImages, setDetectedImages] = useState<DetectedImage[]>([]);
  const [manualConfig, setManualConfig] = useState<GridConfig>({ rows: 2, cols: 2 });
  const [removeBorders, setRemoveBorders] = useState(false);
  const [targetAspectRatio, setTargetAspectRatio] = useState<number | null>(3/4); // Default to 3:4 for Instagram
  const [error, setError] = useState<string | null>(null);
  
  const { processGrid, isProcessing, progress } = useGridDetection();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if only video formats are selected (hide AI tab)
  const isVideoOnlyFormat = useMemo(() => {
    if (selectedFormats.length === 0) return false;
    return selectedFormats.every(f => VIDEO_ONLY_FORMATS.includes(f as typeof VIDEO_ONLY_FORMATS[number]));
  }, [selectedFormats]);

  // Load an image file (from file input or AI generator)
  const loadImageFile = useCallback((file: File, config?: { rows: number; cols: number }) => {
    // Clean up previous URL
    if (uploadedImageUrl) {
      URL.revokeObjectURL(uploadedImageUrl);
    }

    const url = URL.createObjectURL(file);
    setUploadedImage(file);
    setUploadedImageUrl(url);
    setDetectedImages([]);
    setError(null);
    
    // Apply preset config if provided
    if (config) {
      setManualConfig(config);
    }
  }, [uploadedImageUrl]);

  // Handle external image from AI generator with preset config
  useEffect(() => {
    if (externalImage && externalConfig) {
      loadImageFile(externalImage, externalConfig);
      setIsOpen(true);
      setActiveTab('grid');
      
      // Auto-process the grid after a short delay with 3:4 aspect ratio enforcement
      setTimeout(async () => {
        if (externalImage) {
          try {
            // Force 3:4 aspect ratio for Instagram carousel
            const images = await processGrid(externalImage, externalConfig, removeBorders, 3/4);
            setDetectedImages(images);
            toast.success(`${images.length} imagens extraídas com ratio 3:4!`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao processar grelha';
            setError(errorMessage);
            toast.error(errorMessage);
          }
        }
        onExternalImageProcessed?.();
      }, 300);
    }
  }, [externalImage, externalConfig, processGrid, removeBorders, onExternalImageProcessed, loadImageFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG ou WebP.');
      return;
    }

    // Validate file size (max 200MB for grid images - they get split into smaller cells)
    if (file.size > 200 * 1024 * 1024) {
      toast.error('Ficheiro muito grande. Máximo 200MB.');
      return;
    }

    loadImageFile(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [loadImageFile]);

  // Handle image from AI generator for grid cutting
  const handleAIImageToGrid = useCallback((file: File) => {
    loadImageFile(file);
    setActiveTab('grid');
    toast.success('Imagem carregada para corte em grelha');
  }, [loadImageFile]);

  const handleProcessGrid = useCallback(async () => {
    if (!uploadedImage) return;

    setError(null);
    
    try {
      const images = await processGrid(
        uploadedImage,
        manualConfig,
        removeBorders,
        undefined, // No global aspect ratio crop
        targetAspectRatio // Apply aspect ratio to each cell
      );
      
      setDetectedImages(images);
      toast.success(`${images.length} imagens extraídas!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar grelha';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, [uploadedImage, manualConfig, removeBorders, targetAspectRatio, processGrid]);

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

    onAddToCarousel(files, 'grid');
    
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

  // If only video formats, don't show the collapsible at all
  if (isVideoOnlyFormat) {
    return null;
  }

  // Grid content (shared between embedded and collapsible modes)
  const gridContent = (
    <div className="space-y-4">
      {/* Upload Area */}
      {!uploadedImage ? (
        <label
          htmlFor={isEmbedded ? "grid-upload-embedded" : "grid-upload"}
          className={cn(
            "flex flex-col items-center justify-center gap-3 p-6 sm:p-8",
            "border-2 border-dashed rounded-xl cursor-pointer",
            "hover:border-primary/50 hover:bg-primary/5 transition-all",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="p-3 rounded-full bg-primary/10">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-medium text-sm sm:text-base">Carregar Grelha</p>
            <p className="text-xs sm:text-sm text-muted-foreground">PNG, JPG ou WebP até 200MB</p>
          </div>
          <Input
            ref={fileInputRef}
            id={isEmbedded ? "grid-upload-embedded" : "grid-upload"}
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
                manualConfig={manualConfig}
                onManualConfigChange={setManualConfig}
                removeBorders={removeBorders}
                onRemoveBordersChange={setRemoveBorders}
                targetAspectRatio={targetAspectRatio}
                onAspectRatioChange={setTargetAspectRatio}
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
                    Cortar em {manualConfig.rows}×{manualConfig.cols}
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
    </div>
  );

  // Embedded mode - just return the grid content without wrapper
  if (isEmbedded) {
    return gridContent;
  }

  // Full mode with collapsible and tabs
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            "w-full cursor-pointer p-4 rounded-xl",
            "border-2 border-dashed transition-all",
            "hover:border-primary hover:bg-primary/5",
            isOpen ? "border-primary bg-primary/5" : "border-border",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={(e) => {
            if (disabled) {
              e.preventDefault();
              return;
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Grid3x3 className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Dividir Grelha</p>
                <p className="text-xs text-muted-foreground">
                  Separar imagem com várias fotos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] hidden sm:flex">até 200MB</Badge>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </div>
        </div>
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
              {gridContent}
            </TabsContent>

            {/* AI Generator Tab */}
            <TabsContent value="ai" className="p-4 mt-0">
              <AIGenerator
                onAddToCarousel={(files, source) => {
                  onAddToCarousel(files, source);
                  setIsOpen(false);
                }}
                onSendToGridSplitter={handleAIImageToGrid}
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
