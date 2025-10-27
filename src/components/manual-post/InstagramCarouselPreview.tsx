import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Send, Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface InstagramCarouselPreviewProps {
  mediaUrls: string[];
  caption: string;
}

const InstagramCarouselPreview = ({ mediaUrls, caption }: InstagramCarouselPreviewProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const maxCaptionLength = 2200;
  const captionLength = caption.length;
  const getCharCountColor = () => {
    const percentage = (captionLength / maxCaptionLength) * 100;
    if (percentage >= 100) return "text-destructive";
    if (percentage >= 90) return "text-orange-500";
    return "text-muted-foreground";
  };

  const handleNext = () => {
    if (currentIndex < mediaUrls.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
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
      <div className="relative aspect-square bg-muted">
        {mediaUrls.length > 0 ? (
          <>
            <img
              src={mediaUrls[currentIndex]}
              alt={`Slide ${currentIndex + 1}`}
              className="w-full h-full object-cover"
            />
            {mediaUrls.length > 1 && (
              <>
                {/* Navigation buttons */}
                {currentIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 rounded-full"
                    onClick={handlePrev}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                )}
                {currentIndex < mediaUrls.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 rounded-full"
                    onClick={handleNext}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                )}
                {/* Counter */}
                <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
                  <span className="text-xs font-medium">
                    {currentIndex + 1}/{mediaUrls.length}
                  </span>
                </div>
                {/* Dots indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                  {mediaUrls.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        idx === currentIndex ? "bg-primary" : "bg-background/60"
                      }`}
                    />
                  ))}
                </div>
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
        <Heart className="w-6 h-6" />
        <MessageCircle className="w-6 h-6" />
        <Send className="w-6 h-6" />
        <Bookmark className="w-6 h-6 ml-auto" />
      </div>

      {/* Caption */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">teu_perfil</p>
          <span className={`text-xs ${getCharCountColor()}`}>
            {captionLength}/{maxCaptionLength}
          </span>
        </div>
        {caption ? (
          <p className="text-sm whitespace-pre-wrap break-words">{caption}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Escreve uma legenda...</p>
        )}
        {captionLength > maxCaptionLength && (
          <Badge variant="destructive" className="mt-2">
            Legenda excede o limite
          </Badge>
        )}
      </div>
    </Card>
  );
};

export default InstagramCarouselPreview;
