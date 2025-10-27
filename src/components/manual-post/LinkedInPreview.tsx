import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MessageSquare, Repeat2, Send, MoreHorizontal } from "lucide-react";
import { Linkedin } from "lucide-react";

interface LinkedInPreviewProps {
  mediaUrls: string[];
  caption: string;
}

const LinkedInPreview = ({ mediaUrls, caption }: LinkedInPreviewProps) => {
  const maxCaptionLength = 3000;
  const captionLength = caption.length;
  
  const getCharCountColor = () => {
    const percentage = (captionLength / maxCaptionLength) * 100;
    if (percentage >= 100) return "text-destructive";
    if (percentage >= 90) return "text-orange-500";
    return "text-muted-foreground";
  };

  return (
    <Card className="w-full max-w-xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Linkedin className="w-6 h-6 text-primary" />
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

      {/* Media */}
      {mediaUrls.length > 0 && (
        <div className="border-t border-b">
          {mediaUrls.length === 1 ? (
            <div className="w-full aspect-video bg-muted">
              <img
                src={mediaUrls[0]}
                alt="Post media"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-0.5 p-0.5 bg-muted">
              {mediaUrls.slice(0, 4).map((url, idx) => (
                <div key={idx} className="relative aspect-video bg-muted">
                  <img
                    src={url}
                    alt={`Media ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {idx === 3 && mediaUrls.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-2xl font-semibold">
                        +{mediaUrls.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-around p-3 border-t">
        <div className="flex items-center gap-2 text-muted-foreground hover:text-primary cursor-pointer">
          <ThumbsUp className="w-5 h-5" />
          <span className="text-sm">Gosto</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground hover:text-primary cursor-pointer">
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm">Comentar</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground hover:text-primary cursor-pointer">
          <Repeat2 className="w-5 h-5" />
          <span className="text-sm">Partilhar</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground hover:text-primary cursor-pointer">
          <Send className="w-5 h-5" />
          <span className="text-sm">Enviar</span>
        </div>
      </div>
    </Card>
  );
};

export default LinkedInPreview;
