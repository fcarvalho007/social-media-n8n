import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2, MoreVertical, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstagramStoryPreviewProps {
  mediaUrl?: string;
  aspectRatioValid: boolean;
  isVideo?: boolean;
  linkUrl?: string;
  stickerText?: string;
  overlayText?: string;
}

const getDomain = (value?: string) => {
  if (!value) return '';
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
};

const InstagramStoryPreview = ({ mediaUrl, aspectRatioValid, isVideo, linkUrl, stickerText, overlayText }: InstagramStoryPreviewProps) => {
  const isStoryLink = !!linkUrl;
  const stickerLabel = stickerText?.trim() || getDomain(linkUrl) || 'Abrir link';

  return (
    <Card className="w-full max-w-[280px] mx-auto overflow-hidden">
      {/* Story container with 9:16 aspect ratio */}
      <div className="relative w-full" style={{ paddingBottom: "177.78%" }}>
        <div className="absolute inset-0 bg-foreground">
          {mediaUrl ? (
            <>
              {isVideo ? (
                <video src={mediaUrl} className="h-full w-full object-cover" muted playsInline controls={false} />
              ) : (
                <img src={mediaUrl} alt="Pré-visualização da Story" className="h-full w-full object-cover" />
              )}
              {/* Story header */}
              <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-foreground/70 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary p-0.5">
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                      <span className="text-xs font-semibold text-foreground">TU</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-primary-foreground">teu_perfil</span>
                  <span className="text-xs text-primary-foreground/80 ml-auto">agora</span>
                  <MoreVertical className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
              {isStoryLink && overlayText?.trim() && (
                <div className="absolute left-5 right-5 top-[26%] text-center">
                  <span className="inline-block rounded-md bg-foreground/45 px-3 py-2 text-xl font-semibold leading-tight text-primary-foreground shadow-lg backdrop-blur-sm">
                    {overlayText.trim()}
                  </span>
                </div>
              )}
              {isStoryLink && (
                <div className="absolute bottom-[86px] left-1/2 w-[78%] -translate-x-1/2">
                  <div className="flex items-center justify-center gap-2 rounded-full bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-lg">
                    <Link2 className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <span className="truncate">{stickerLabel}</span>
                  </div>
                </div>
              )}
              {/* Story footer */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enviar mensagem"
                    className="flex-1 bg-transparent border border-primary-foreground/50 rounded-full px-4 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/70"
                    disabled
                  />
                  <Send className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary-foreground">
              <p className="text-sm">Adiciona uma imagem ou vídeo</p>
            </div>
          )}
        </div>
      </div>

      {/* Validation badge */}
      <div className="p-3 border-t">
        {isStoryLink && mediaUrl && (
          <p className="mb-2 text-center text-xs text-muted-foreground">Simulação aproximada. O resultado final depende do teu Instagram.</p>
        )}
        {!aspectRatioValid && mediaUrl && (
          <Badge variant="destructive" className="w-full justify-center">
            Aspect ratio deve ser 9:16
          </Badge>
        )}
        {aspectRatioValid && mediaUrl && !isStoryLink && (
          <Badge variant="outline" className={cn("w-full justify-center border-success text-success")}>
            ✓ Formato correto
          </Badge>
        )}
      </div>
    </Card>
  );
};

export default InstagramStoryPreview;
