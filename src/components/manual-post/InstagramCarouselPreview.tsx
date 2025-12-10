import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Send, Bookmark, ChevronLeft, ChevronRight, Expand, ImageIcon, VideoIcon, AlertCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { DeviceFrame } from "./DeviceFrame";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export interface MediaItem {
  url: string;
  isVideo: boolean;
}

interface InstagramCarouselPreviewProps {
  mediaUrls?: string[];
  mediaItems?: MediaItem[];
  caption: string;
}

const InstagramCarouselPreview = ({ mediaUrls, mediaItems, caption }: InstagramCarouselPreviewProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<number, boolean>>({});
  
  // Support both legacy mediaUrls and new mediaItems prop
  const items: MediaItem[] = mediaItems || (mediaUrls?.map(url => ({ url, isVideo: false })) || []);
  
  const maxCaptionLength = 2200;
  const captionLength = caption.length;
  const getCharCountColor = () => {
    const percentage = (captionLength / maxCaptionLength) * 100;
    if (percentage >= 100) return "text-destructive font-bold";
    if (percentage >= 90) return "text-amber-500";
    if (percentage >= 80) return "text-yellow-500";
    return "text-muted-foreground";
  };

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, items.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const goToSlide = (index: number) => {
    if (index >= 0 && index < items.length) {
      setCurrentIndex(index);
    }
  };

  // Initialize loading states when items change
  useEffect(() => {
    const initialLoading: Record<number, boolean> = {};
    items.forEach((_, idx) => {
      initialLoading[idx] = true;
    });
    setLoadingStates(initialLoading);
    setErrorStates({});
  }, [items.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, isFullscreen]);

  const handleMediaLoad = (index: number) => {
    setLoadingStates(prev => ({ ...prev, [index]: false }));
  };

  const handleMediaError = (index: number) => {
    setLoadingStates(prev => ({ ...prev, [index]: false }));
    setErrorStates(prev => ({ ...prev, [index]: true }));
  };

  const renderMedia = (item: MediaItem, index: number, className?: string) => {
    const isLoading = loadingStates[index];
    const hasError = errorStates[index];

    if (hasError) {
      return (
        <div className={cn("w-full h-full flex flex-col items-center justify-center bg-muted/50", className)}>
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Erro ao carregar</p>
        </div>
      );
    }

    if (item.isVideo) {
      return (
        <div className="relative w-full h-full">
          {isLoading && (
            <Skeleton className="absolute inset-0 z-10" />
          )}
          <video
            src={item.url}
            className={cn("w-full h-full object-cover", className)}
            muted
            loop
            autoPlay
            playsInline
            onLoadedData={() => handleMediaLoad(index)}
            onError={() => handleMediaError(index)}
          />
          {/* Video indicator badge */}
          <Badge 
            variant="secondary" 
            className="absolute bottom-2 left-2 gap-1 text-[10px] bg-black/60 text-white border-0"
          >
            <VideoIcon className="h-3 w-3" />
            Vídeo
          </Badge>
        </div>
      );
    }
    
    return (
      <div className="relative w-full h-full">
        {isLoading && (
          <Skeleton className="absolute inset-0 z-10" />
        )}
        <img
          src={item.url}
          alt={`Slide ${index + 1}`}
          className={cn("w-full h-full object-cover", className, isLoading && "opacity-0")}
          onLoad={() => handleMediaLoad(index)}
          onError={() => handleMediaError(index)}
        />
      </div>
    );
  };

  return (
    <>
      <DeviceFrame type="phone">
        <Card className="w-full overflow-hidden border-0 rounded-none shadow-none">
          {/* Header */}
          <div className="flex items-center gap-3 p-3 border-b">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-0.5">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <span className="text-xs font-semibold">TU</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">teu_perfil</p>
            </div>
          </div>

          {/* Media Carousel */}
          <div className="relative aspect-square bg-muted group">
            {items.length > 0 ? (
              <>
                {renderMedia(items[currentIndex], currentIndex)}
                
                {/* Expand button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-10 bg-black/50 hover:bg-black/70 text-white h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsFullscreen(true)}
                  aria-label="Expandir preview"
                >
                  <Expand className="h-3.5 w-3.5" />
                </Button>
                
                {items.length > 1 && (
                  <>
                    {/* Navigation buttons */}
                    {currentIndex > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 rounded-full h-7 w-7 transition-all hover:scale-110"
                        onClick={handlePrev}
                        aria-label="Imagem anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    )}
                    {currentIndex < items.length - 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 rounded-full h-7 w-7 transition-all hover:scale-110"
                        onClick={handleNext}
                        aria-label="Próxima imagem"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                    {/* Counter */}
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
                      <span className="text-xs font-medium text-white">
                        {currentIndex + 1}/{items.length}
                      </span>
                    </div>
                    {/* Clickable dots indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {items.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => goToSlide(idx)}
                          aria-label={`Ir para slide ${idx + 1}`}
                          className={cn(
                            "rounded-full transition-all duration-200 hover:scale-125",
                            idx === currentIndex 
                              ? "bg-primary w-4 h-1.5" 
                              : "bg-white/60 w-1.5 h-1.5 hover:bg-white/80"
                          )}
                        />
                      ))}
                    </div>
                    
                    {/* Swipe Indicator - Animated */}
                    {items.length > 1 && currentIndex === 0 && (
                      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1 text-white/80 animate-pulse">
                        <ChevronLeft className="h-3 w-3" />
                        <span className="text-[10px] font-medium">Desliza</span>
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Sem média</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 p-3 border-b">
            <Heart className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform" />
            <MessageCircle className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform" />
            <Send className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform" />
            <Bookmark className="w-5 h-5 ml-auto cursor-pointer hover:scale-110 transition-transform" />
          </div>

          {/* Caption */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold">teu_perfil</p>
              <span className={cn("text-[10px] transition-colors", getCharCountColor())}>
                {captionLength.toLocaleString()}/{maxCaptionLength.toLocaleString()}
              </span>
            </div>
            {caption ? (
              <p className="text-xs whitespace-pre-wrap break-words line-clamp-3">{caption}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Escreve uma legenda...</p>
            )}
            {captionLength > maxCaptionLength && (
              <Badge variant="destructive" className="mt-1 text-[10px]">
                Legenda excede o limite
              </Badge>
            )}
          </div>
        </Card>
      </DeviceFrame>
      
      {/* Fullscreen Preview Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">Preview em ecrã completo</DialogTitle>
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            {items.length > 0 && (
              <>
                {renderMedia(items[currentIndex], currentIndex, "max-h-full max-w-full object-contain")}
                
                {items.length > 1 && (
                  <>
                    {currentIndex > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full h-12 w-12"
                        onClick={handlePrev}
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </Button>
                    )}
                    {currentIndex < items.length - 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full h-12 w-12"
                        onClick={handleNext}
                      >
                        <ChevronRight className="w-6 h-6" />
                      </Button>
                    )}
                    
                    {/* Counter */}
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-sm font-medium text-white">
                        {currentIndex + 1}/{items.length}
                      </span>
                    </div>
                    
                    {/* Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {items.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => goToSlide(idx)}
                          className={cn(
                            "rounded-full transition-all duration-200",
                            idx === currentIndex 
                              ? "bg-white w-6 h-2" 
                              : "bg-white/50 w-2 h-2 hover:bg-white/70"
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InstagramCarouselPreview;
