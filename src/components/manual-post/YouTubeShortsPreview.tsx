import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, MessageCircle, Share2, MoreVertical, Play, Music2 } from 'lucide-react';

interface YouTubeShortsPreviewProps {
  mediaUrl?: string;
  caption: string;
  isVideo?: boolean;
}

export default function YouTubeShortsPreview({ mediaUrl, caption, isVideo = true }: YouTubeShortsPreviewProps) {
  const maxCaptionLength = 100;

  return (
    <Card className="overflow-hidden bg-black text-white max-w-[280px] mx-auto">
      {/* 9:16 Aspect ratio container */}
      <div className="relative" style={{ paddingBottom: '177.78%' }}>
        <div className="absolute inset-0">
          {/* Media */}
          {mediaUrl ? (
            <div className="w-full h-full relative">
              {isVideo ? (
                <video 
                  src={mediaUrl} 
                  className="w-full h-full object-cover"
                  muted
                  loop
                />
              ) : (
                <img 
                  src={mediaUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              )}
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-800 flex items-center justify-center">
              <div className="text-center text-zinc-500">
                <Play className="w-12 h-12 mx-auto mb-2" />
                <span className="text-sm">Vídeo Short</span>
              </div>
            </div>
          )}

          {/* Shorts Badge */}
          <div className="absolute top-3 left-3">
            <Badge className="bg-[#FF0000] hover:bg-[#FF0000] text-white border-0 font-semibold">
              Shorts
            </Badge>
          </div>

          {/* Right side buttons */}
          <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
            <button className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <ThumbsUp className="w-5 h-5" />
              </div>
              <span className="text-xs">1.2K</span>
            </button>
            
            <button className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <ThumbsDown className="w-5 h-5" />
              </div>
              <span className="text-xs">Não</span>
            </button>
            
            <button className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-xs">234</span>
            </button>
            
            <button className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-xs">Partilhar</span>
            </button>
            
            <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-14 p-3 bg-gradient-to-t from-black/80 to-transparent">
            {/* Channel info */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#FF0000] flex items-center justify-center text-xs font-bold">
                @
              </div>
              <span className="font-medium text-sm">@seucanal</span>
              <button className="ml-2 px-2 py-0.5 bg-white text-black text-xs font-semibold rounded-sm">
                Subscrever
              </button>
            </div>
            
            {/* Caption */}
            <p className="text-sm line-clamp-2">
              {caption || 'Descrição do seu Short...'}
            </p>
            
            {/* Music */}
            <div className="flex items-center gap-2 mt-2">
              <Music2 className="w-3 h-3" />
              <span className="text-xs text-zinc-300 truncate">Som original - @seucanal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Character count */}
      <div className="p-2 border-t border-zinc-800 flex justify-between items-center">
        <span className="text-xs text-zinc-500">YouTube Shorts</span>
        <span className={`text-xs ${caption.length > maxCaptionLength ? 'text-red-500' : 'text-zinc-500'}`}>
          {caption.length}/{maxCaptionLength}
        </span>
      </div>
    </Card>
  );
}
