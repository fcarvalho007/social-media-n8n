import { Card } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, Share2, Download, MoreHorizontal, Play, Bookmark } from 'lucide-react';

interface YouTubeVideoPreviewProps {
  mediaUrl?: string;
  caption: string;
  thumbnailUrl?: string;
}

export default function YouTubeVideoPreview({ mediaUrl, caption, thumbnailUrl }: YouTubeVideoPreviewProps) {
  const maxTitleLength = 100;
  const displayMedia = thumbnailUrl || mediaUrl;

  return (
    <Card className="overflow-hidden bg-white dark:bg-zinc-900 max-w-[400px] mx-auto">
      {/* 16:9 Video player */}
      <div className="relative bg-black" style={{ paddingBottom: '56.25%' }}>
        <div className="absolute inset-0">
          {displayMedia ? (
            <div className="w-full h-full relative">
              <img 
                src={displayMedia} 
                alt="Thumbnail" 
                className="w-full h-full object-cover"
              />
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-16 h-16 rounded-full bg-[#FF0000] flex items-center justify-center">
                  <Play className="w-8 h-8 text-white fill-white ml-1" />
                </div>
              </div>
              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700">
                <div className="h-full bg-[#FF0000] w-0"></div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <div className="text-center text-zinc-500">
                <Play className="w-12 h-12 mx-auto mb-2" />
                <span className="text-sm text-white">Vídeo YouTube</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video info */}
      <div className="p-3">
        <div className="flex gap-3">
          {/* Channel avatar */}
          <div className="flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#FF0000] flex items-center justify-center text-white text-sm font-bold">
              C
            </div>
          </div>

          {/* Title and channel */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 text-foreground">
              {caption || 'Título do seu vídeo...'}
            </h3>
            <div className="text-xs text-muted-foreground mt-1">
              <span>Seu Canal</span>
              <span className="mx-1">•</span>
              <span>0 visualizações</span>
              <span className="mx-1">•</span>
              <span>agora</span>
            </div>
          </div>

          {/* More options */}
          <button className="flex-shrink-0 text-muted-foreground">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm hover:bg-muted/80">
            <ThumbsUp className="w-4 h-4" />
            <span>0</span>
            <div className="w-px h-4 bg-border mx-1"></div>
            <ThumbsDown className="w-4 h-4" />
          </button>
          
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm hover:bg-muted/80">
            <Share2 className="w-4 h-4" />
            <span>Partilhar</span>
          </button>
          
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm hover:bg-muted/80">
            <Download className="w-4 h-4" />
            <span>Transferir</span>
          </button>
          
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm hover:bg-muted/80">
            <Bookmark className="w-4 h-4" />
            <span>Guardar</span>
          </button>
        </div>
      </div>

      {/* Character count */}
      <div className="px-3 pb-3 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">YouTube Vídeo</span>
        <span className={`text-xs ${caption.length > maxTitleLength ? 'text-destructive' : 'text-muted-foreground'}`}>
          {caption.length}/{maxTitleLength}
        </span>
      </div>
    </Card>
  );
}
