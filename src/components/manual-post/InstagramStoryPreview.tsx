import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, MoreVertical } from "lucide-react";

interface InstagramStoryPreviewProps {
  mediaUrl?: string;
  aspectRatioValid: boolean;
}

const InstagramStoryPreview = ({ mediaUrl, aspectRatioValid }: InstagramStoryPreviewProps) => {
  return (
    <Card className="w-full max-w-[280px] mx-auto overflow-hidden">
      {/* Story container with 9:16 aspect ratio */}
      <div className="relative w-full" style={{ paddingBottom: "177.78%" }}>
        <div className="absolute inset-0 bg-black">
          {mediaUrl ? (
            <>
              <img
                src={mediaUrl}
                alt="Story preview"
                className="w-full h-full object-cover"
              />
              {/* Story header */}
              <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-0.5">
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">TU</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white">teu_perfil</span>
                  <span className="text-xs text-white/80 ml-auto">agora</span>
                  <MoreVertical className="w-5 h-5 text-white" />
                </div>
              </div>
              {/* Story footer */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enviar mensagem"
                    className="flex-1 bg-transparent border border-white/50 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/70"
                    disabled
                  />
                  <Send className="w-5 h-5 text-white" />
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <p className="text-sm">Adiciona uma imagem ou vídeo</p>
            </div>
          )}
        </div>
      </div>

      {/* Validation badge */}
      <div className="p-3 border-t">
        {!aspectRatioValid && mediaUrl && (
          <Badge variant="destructive" className="w-full justify-center">
            Aspect ratio deve ser 9:16
          </Badge>
        )}
        {aspectRatioValid && mediaUrl && (
          <Badge variant="outline" className="w-full justify-center border-green-500 text-green-500">
            ✓ Formato correto
          </Badge>
        )}
      </div>
    </Card>
  );
};

export default InstagramStoryPreview;
