import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MessageSquare, Repeat2, Send, MoreHorizontal, FileText, ChevronLeft, ChevronRight, Video } from "lucide-react";
import { Linkedin } from "lucide-react";
import { DeviceFrame } from "./DeviceFrame";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface LinkedInDocumentPreviewProps {
  mediaUrls: string[];
  mediaFiles?: File[];
  caption: string;
}

// Extract frame URL from video file
async function extractVideoFrameUrl(videoFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    
    const cleanup = () => {
      URL.revokeObjectURL(video.src);
    };
    
    video.onloadeddata = () => {
      video.currentTime = 0.5;
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
    
    video.onerror = () => {
      cleanup();
      reject(new Error('Could not load video'));
    };
    
    video.src = URL.createObjectURL(videoFile);
    video.load();
  });
}

const LinkedInDocumentPreview = ({ mediaUrls, mediaFiles, caption }: LinkedInDocumentPreviewProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [processedUrls, setProcessedUrls] = useState<string[]>([]);
  const [videoIndices, setVideoIndices] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const mainViewRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  
  // Reset currentPage when media changes to prevent index out of bounds
  useEffect(() => {
    setCurrentPage(0);
  }, [mediaUrls.length]);
  
  // Process media to extract video frames
  useEffect(() => {
    async function processMedia() {
      setIsProcessing(true);
      const urls: string[] = [];
      const vidIndices = new Set<number>();
      
      for (let i = 0; i < mediaUrls.length; i++) {
        const file = mediaFiles?.[i];
        if (file?.type?.startsWith('video/')) {
          vidIndices.add(i);
          try {
            const frameUrl = await extractVideoFrameUrl(file);
            urls.push(frameUrl);
          } catch {
            urls.push(mediaUrls[i]);
          }
        } else {
          urls.push(mediaUrls[i]);
        }
      }
      
      setProcessedUrls(urls);
      setVideoIndices(vidIndices);
      setIsProcessing(false);
    }
    
    if (mediaUrls.length > 0) {
      processMedia();
    } else {
      setProcessedUrls([]);
      setVideoIndices(new Set());
      setIsProcessing(false);
    }
  }, [mediaUrls, mediaFiles]);

  const maxCaptionLength = 3000;
  const captionLength = caption.length;
  const pageCount = processedUrls.length;
  
  const getCharCountColor = () => {
    const percentage = (captionLength / maxCaptionLength) * 100;
    if (percentage >= 100) return "text-destructive";
    if (percentage >= 90) return "text-orange-500";
    return "text-muted-foreground";
  };

  const handleNext = useCallback(() => {
    if (currentPage < pageCount - 1) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, pageCount]);

  const handlePrev = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  // Scroll thumbnail into view when page changes
  useEffect(() => {
    if (thumbnailsRef.current) {
      const thumbnail = thumbnailsRef.current.querySelector(`[data-page="${currentPage}"]`);
      thumbnail?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentPage]);

  // Touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) { // Minimum swipe distance
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    
    setTouchStart(null);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    
    const container = mainViewRef.current;
    container?.addEventListener('keydown', handleKeyDown);
    return () => container?.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  return (
    <DeviceFrame type="desktop">
      <div className="bg-muted/30 min-h-[400px] p-4">
        <Card className="w-full max-w-xl mx-auto overflow-hidden shadow-sm">
          {/* Header */}
          <div className="flex items-start gap-3 p-4 border-b">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Linkedin className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Teu Nome</p>
              <p className="text-xs text-muted-foreground">Teu Título Profissional</p>
              <p className="text-xs text-muted-foreground">agora • 🌐</p>
            </div>
            <MoreHorizontal className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </div>

          {/* Caption */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs ${getCharCountColor()}`}>
                {captionLength}/{maxCaptionLength}
              </span>
            </div>
            {caption ? (
              <p className="text-sm whitespace-pre-wrap break-words">{caption}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Escreve o corpo do post...</p>
            )}
            {captionLength > maxCaptionLength && (
              <Badge variant="destructive" className="mt-2">
                Texto excede o limite
              </Badge>
            )}
          </div>

          {/* PDF Document Viewer */}
          <div className="border-t border-b bg-muted/20">
            {isProcessing ? (
              <div className="aspect-[4/5] flex flex-col items-center justify-center text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2" />
                <p className="text-sm">A processar imagens...</p>
              </div>
            ) : pageCount > 0 && processedUrls[currentPage] ? (
              <div className="flex flex-col">
                {/* Main Page View - PDF-like appearance */}
                <div 
                  ref={mainViewRef}
                  className="relative aspect-[4/5] bg-gradient-to-br from-muted/30 to-muted/50 group cursor-grab active:cursor-grabbing"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  tabIndex={0}
                  role="region"
                  aria-label={`Página ${currentPage + 1} de ${pageCount}`}
                >
                  {/* Paper effect container */}
                  <div className="absolute inset-2 sm:inset-4 bg-white rounded shadow-lg overflow-hidden flex items-center justify-center">
                    {/* Page shadow effect */}
                    <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-black/5 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                    
                    <img
                      src={processedUrls[currentPage]}
                      alt={`Página ${currentPage + 1}`}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                    
                    {/* Video indicator badge */}
                    {videoIndices.has(currentPage) && (
                      <div className="absolute bottom-3 right-3">
                        <Badge variant="secondary" className="gap-1 bg-black/70 text-white text-xs">
                          <Video className="h-3 w-3" />
                          Frame extraída
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {/* Document badge */}
                  <div className="absolute top-1 left-1 sm:top-2 sm:left-2 flex items-center gap-2 z-10">
                    <Badge variant="secondary" className="gap-1.5 bg-background/95 backdrop-blur-sm text-xs">
                      <FileText className="h-3 w-3" />
                      PDF · {pageCount} {pageCount === 1 ? 'página' : 'páginas'}
                    </Badge>
                  </div>
                  
                  {/* Navigation arrows - always visible on touch, hover on desktop */}
                  {pageCount > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className={cn(
                          "absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 sm:h-10 sm:w-10 shadow-lg transition-all z-10",
                          "bg-background/95 hover:bg-background border",
                          currentPage === 0 ? "opacity-30 cursor-not-allowed" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        )}
                        onClick={handlePrev}
                        disabled={currentPage === 0}
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>
                      
                      <Button
                        variant="secondary"
                        size="icon"
                        className={cn(
                          "absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 sm:h-10 sm:w-10 shadow-lg transition-all z-10",
                          "bg-background/95 hover:bg-background border",
                          currentPage === pageCount - 1 ? "opacity-30 cursor-not-allowed" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        )}
                        onClick={handleNext}
                        disabled={currentPage === pageCount - 1}
                        aria-label="Próxima página"
                      >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Page Navigation Bar */}
                {pageCount > 1 && (
                  <div className="flex items-center justify-center gap-3 py-2 bg-muted/40 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrev}
                      disabled={currentPage === 0}
                      className="h-7 px-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium tabular-nums min-w-[80px] text-center">
                      {currentPage + 1} de {pageCount}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNext}
                      disabled={currentPage === pageCount - 1}
                      className="h-7 px-2"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Thumbnail Strip - scrollable */}
                {pageCount > 1 && (
                  <div 
                    ref={thumbnailsRef}
                    className="flex gap-1.5 p-2 overflow-x-auto bg-muted/30 border-t scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {processedUrls.map((url, idx) => (
                      <button
                        key={idx}
                        data-page={idx}
                        onClick={() => setCurrentPage(idx)}
                        className={cn(
                          "flex-shrink-0 w-10 h-12 sm:w-12 sm:h-16 rounded overflow-hidden transition-all relative",
                          "border-2 bg-white shadow-sm",
                          idx === currentPage 
                            ? "border-primary ring-1 ring-primary/30 scale-105" 
                            : "border-transparent opacity-70 hover:opacity-100 hover:border-muted-foreground/30"
                        )}
                        aria-label={`Ir para página ${idx + 1}`}
                        aria-current={idx === currentPage ? 'page' : undefined}
                      >
                        <img 
                          src={url} 
                          alt={`Miniatura ${idx + 1}`} 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                        />
                        {videoIndices.has(idx) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Video className="h-3 w-3 text-white" />
                          </div>
                        )}
                        <span className="absolute bottom-0 inset-x-0 text-[9px] font-medium text-center bg-black/50 text-white py-0.5">
                          {idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-[4/5] flex flex-col items-center justify-center text-muted-foreground">
                <FileText className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">Adicione imagens para criar o documento</p>
              </div>
            )}
          </div>

          {/* Engagement Stats */}
          <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-b">
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <ThumbsUp className="w-2.5 h-2.5 text-white" />
                </div>
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-[8px]">❤️</span>
                </div>
              </div>
              <span>42</span>
            </div>
            <span>3 comentários • 2 partilhas</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-around p-2 border-t">
            <div className="flex items-center gap-1.5 text-muted-foreground hover:text-primary cursor-pointer px-3 py-2 rounded-lg hover:bg-accent transition-colors">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-xs font-medium">Gosto</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground hover:text-primary cursor-pointer px-3 py-2 rounded-lg hover:bg-accent transition-colors">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs font-medium">Comentar</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground hover:text-primary cursor-pointer px-3 py-2 rounded-lg hover:bg-accent transition-colors">
              <Repeat2 className="w-4 h-4" />
              <span className="text-xs font-medium">Partilhar</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground hover:text-primary cursor-pointer px-3 py-2 rounded-lg hover:bg-accent transition-colors">
              <Send className="w-4 h-4" />
              <span className="text-xs font-medium">Enviar</span>
            </div>
          </div>
        </Card>
      </div>
    </DeviceFrame>
  );
};

export default LinkedInDocumentPreview;