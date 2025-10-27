import { Heart, MessageCircle, Send, Bookmark, Volume2, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface IgPostMockProps {
  mediaCount?: number;
  hasWarnings?: boolean;
  warningCount?: number;
}

export const IgPostMock = ({ mediaCount = 1, hasWarnings, warningCount }: IgPostMockProps) => {
  return (
    <div className="w-full max-w-[640px] mx-auto rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
        <div className="flex-1 flex items-center gap-1.5">
          <span className="text-sm font-semibold tracking-tight">theaipage</span>
          <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
          <span className="text-muted-foreground text-sm">• 20 h</span>
        </div>
        <button className="p-1 hover:bg-muted/50 rounded-full transition-colors" aria-label="Mais opções">
          <div className="flex flex-col gap-0.5">
            <div className="w-1 h-1 rounded-full bg-foreground" />
            <div className="w-1 h-1 rounded-full bg-foreground" />
            <div className="w-1 h-1 rounded-full bg-foreground" />
          </div>
        </button>
      </div>

      {hasWarnings && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
          <Badge variant="outline" className="text-amber-600 border-amber-600/30">
            Aviso · {warningCount}
          </Badge>
        </div>
      )}

      {/* Media Area */}
      <div className="relative aspect-[4/5] bg-gradient-to-br from-muted via-muted/80 to-muted overflow-hidden">
        {/* Carousel Mock */}
        {mediaCount > 1 && (
          <>
            {/* Navigation Arrows */}
            <button className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-background transition-colors z-10" aria-label="Anterior">
              <div className="w-2 h-2 border-l-2 border-b-2 border-foreground -rotate-45 -mr-0.5" />
            </button>
            <button className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-background transition-colors z-10" aria-label="Próximo">
              <div className="w-2 h-2 border-r-2 border-t-2 border-foreground -rotate-45 -ml-0.5" />
            </button>
            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {Array.from({ length: Math.min(mediaCount, 5) }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === 0 ? "bg-primary" : "bg-background/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Sound Icon */}
        <button className="absolute top-3 right-3 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors" aria-label="Som desativado">
          <Volume2 className="w-4 h-4" />
        </button>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
          <h3 className="text-white text-xl font-bold leading-snug tracking-tight line-clamp-2">
            Descubra estratégias inovadoras
          </h3>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-2 border-b">
        <button className="hover:opacity-70 transition-opacity" aria-label="Gostar">
          <Heart className="w-6 h-6" />
        </button>
        <button className="hover:opacity-70 transition-opacity" aria-label="Comentar">
          <MessageCircle className="w-6 h-6" />
        </button>
        <button className="hover:opacity-70 transition-opacity" aria-label="Partilhar">
          <Send className="w-6 h-6" />
        </button>
        <button className="ml-auto hover:opacity-70 transition-opacity" aria-label="Guardar">
          <Bookmark className="w-6 h-6" />
        </button>
      </div>

      {/* Metrics & Caption */}
      <div className="px-4 pb-3 space-y-1.5">
        <p className="text-sm font-semibold">3 gostos</p>
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">theaipage</span> Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor...{" "}
          <button className="text-muted-foreground hover:text-foreground transition-colors">mais</button>
        </p>
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Ver tradução
        </button>
        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Ver todos os 22 comentários
        </button>
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            placeholder="Adicionar comentário..."
            className="flex-1 text-sm bg-transparent outline-none"
            disabled
          />
        </div>
      </div>
    </div>
  );
};
