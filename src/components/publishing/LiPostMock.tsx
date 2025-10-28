import { ThumbsUp, MessageSquare, Repeat2, Send, FileText, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LiPostMockProps {
  mediaCount?: number;
  hasWarnings?: boolean;
  warningCount?: number;
}

export const LiPostMock = ({ mediaCount = 0, hasWarnings, warningCount }: LiPostMockProps) => {
  return (
    <div className="w-full max-w-[640px] mx-auto rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3 border-b">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold tracking-tight leading-snug">LinkedIn</h4>
              <p className="text-xs text-muted-foreground leading-snug line-clamp-1">
                Publicação Profissional
              </p>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <span>1 h</span>
                <span>•</span>
                <span>Edited</span>
                <span>•</span>
                <Globe className="w-3 h-3" />
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-3">
              + Seguir
            </Button>
          </div>
        </div>
        <button className="p-1 hover:bg-muted/50 rounded transition-colors" aria-label="Mais opções">
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

      {/* Body Text */}
      <div className="px-4 py-3">
        <p className="text-[15px] leading-relaxed">
          O seu texto de publicação aparecerá aqui...{" "}
          <button className="text-primary hover:underline font-medium">ver mais</button>
        </p>
      </div>

      {/* Document Preview */}
      {mediaCount > 0 && (
        <div className="mx-4 mb-3">
          <div className="relative aspect-[1200/627] rounded-lg overflow-hidden border bg-muted">
            {/* Document Mock */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
              <FileText className="w-16 h-16 text-muted-foreground/30" />
            </div>
            
            {/* Document Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center gap-2 text-white">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Document (PDF) · {mediaCount} {mediaCount === 1 ? 'página' : 'páginas'}</span>
              </div>
            </div>

            {/* Corner Navigation */}
            {mediaCount > 1 && (
              <button className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-background transition-colors" aria-label="Próxima página">
                <div className="w-2 h-2 border-r-2 border-t-2 border-foreground -rotate-45 -ml-0.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reactions */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-b text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-4 h-4 rounded-full bg-blue-500 border border-card flex items-center justify-center">
              <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
            </div>
            <div className="w-4 h-4 rounded-full bg-green-500 border border-card" />
            <div className="w-4 h-4 rounded-full bg-red-500 border border-card" />
          </div>
          <span>14</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="hover:text-foreground hover:underline transition-colors">2 comentários</button>
          <span>•</span>
          <button className="hover:text-foreground hover:underline transition-colors">1 repost</button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-1 px-2 py-1.5">
        <button className="flex flex-col items-center gap-1 py-2 px-3 hover:bg-muted/50 rounded transition-colors" aria-label="Gostar">
          <ThumbsUp className="w-5 h-5" />
          <span className="text-xs font-medium">Like</span>
        </button>
        <button className="flex flex-col items-center gap-1 py-2 px-3 hover:bg-muted/50 rounded transition-colors" aria-label="Comentar">
          <MessageSquare className="w-5 h-5" />
          <span className="text-xs font-medium">Comment</span>
        </button>
        <button className="flex flex-col items-center gap-1 py-2 px-3 hover:bg-muted/50 rounded transition-colors" aria-label="Repost">
          <Repeat2 className="w-5 h-5" />
          <span className="text-xs font-medium">Repost</span>
        </button>
        <button className="flex flex-col items-center gap-1 py-2 px-3 hover:bg-muted/50 rounded transition-colors" aria-label="Enviar">
          <Send className="w-5 h-5" />
          <span className="text-xs font-medium">Send</span>
        </button>
      </div>
    </div>
  );
};
