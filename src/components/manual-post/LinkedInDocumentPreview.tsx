import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MessageSquare, Repeat2, Send, MoreHorizontal, FileText, ChevronLeft, ChevronRight, Video } from "lucide-react";
import { Linkedin } from "lucide-react";
import { DeviceFrame } from "./DeviceFrame";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  
  // Process media to extract video frames
  useEffect(() => {
    async function processMedia() {
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
            // Fallback: use original URL (will show video element or placeholder)
            urls.push(mediaUrls[i]);
          }
        } else {
          urls.push(mediaUrls[i]);
        }
      }
      
      setProcessedUrls(urls);
      setVideoIndices(vidIndices);
    }
    
    if (mediaUrls.length > 0) {
      processMedia();
    } else {
      setProcessedUrls([]);
      setVideoIndices(new Set());
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

  const handleNext = () => {
    if (currentPage < pageCount - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

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

          {/* Document Preview - Shows images as PDF pages */}
          <div className="border-t border-b">
            <div className="relative aspect-[4/5] bg-muted/50 group">
              {pageCount > 0 ? (
                <>
                  {/* Document page display */}
                  <div className="w-full h-full flex items-center justify-center bg-white relative">
                    <img
                      src={processedUrls[currentPage]}
                      alt={`Página ${currentPage + 1}`}
                      className="w-full h-full object-contain"
                    />
                    {/* Video indicator badge on the page */}
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
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1.5 bg-background/90 backdrop-blur-sm">
                      <FileText className="h-3.5 w-3.5" />
                      Documento PDF · {pageCount} {pageCount === 1 ? 'página' : 'páginas'}
                    </Badge>
                  </div>
                  
                  {/* Navigation for multiple pages */}
                  {pageCount > 1 && (
                    <>
                      {currentPage > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-all"
                          onClick={handlePrev}
                          aria-label="Página anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      )}
                      {currentPage < pageCount - 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-all"
                          onClick={handleNext}
                          aria-label="Próxima página"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {/* Page indicator */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full">
                        <span className="text-xs font-medium">
                          {currentPage + 1} de {pageCount}
                        </span>
                      </div>
                      
                    {/* Dots indicator */}
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {processedUrls.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentPage(idx)}
                            aria-label={`Ir para página ${idx + 1}`}
                            className={cn(
                              "rounded-full transition-all duration-200",
                              idx === currentPage 
                                ? "bg-primary w-4 h-1.5" 
                                : "bg-muted-foreground/40 w-1.5 h-1.5 hover:bg-muted-foreground/60"
                            )}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <FileText className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">Adicione imagens para criar o documento</p>
                </div>
              )}
            </div>
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
