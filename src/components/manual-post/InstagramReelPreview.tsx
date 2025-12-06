import { Card } from '@/components/ui/card';
import { Heart, MessageCircle, Send, Bookmark, Music2, MoreHorizontal, Play } from 'lucide-react';

interface InstagramReelPreviewProps {
  mediaUrl?: string;
  caption: string;
}

export default function InstagramReelPreview({ mediaUrl, caption }: InstagramReelPreviewProps) {
  const maxCaptionLength = 2200;

  // Extract hashtags
  const hashtags = caption.match(/#\w+/g) || [];

  return (
    <Card className="overflow-hidden bg-black text-white max-w-[280px] mx-auto border-0">
      {/* 9:16 Aspect ratio container */}
      <div className="relative" style={{ paddingBottom: '177.78%' }}>
        <div className="absolute inset-0">
          {/* Media */}
          {mediaUrl ? (
            <div className="w-full h-full relative">
              <video 
                src={mediaUrl} 
                className="w-full h-full object-cover"
                muted
                loop
              />
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 flex items-center justify-center">
              <div className="text-center text-white/70">
                <Play className="w-12 h-12 mx-auto mb-2" />
                <span className="text-sm">Reel Instagram</span>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span className="font-semibold text-sm">Reels</span>
            <button className="p-1">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Right side buttons */}
          <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
            <button className="flex flex-col items-center gap-1">
              <Heart className="w-7 h-7" />
              <span className="text-xs">1.2K</span>
            </button>
            
            <button className="flex flex-col items-center gap-1">
              <MessageCircle className="w-7 h-7" />
              <span className="text-xs">234</span>
            </button>
            
            <button className="flex flex-col items-center gap-1">
              <Send className="w-7 h-7 -rotate-12" />
              <span className="text-xs">56</span>
            </button>
            
            <button className="flex flex-col items-center gap-1">
              <Bookmark className="w-7 h-7" />
            </button>

            {/* Music disc */}
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 border border-white/20 overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                <Music2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-14 p-3 bg-gradient-to-t from-black/80 to-transparent">
            {/* Username */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-0.5">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs font-bold">
                  @
                </div>
              </div>
              <span className="font-semibold text-sm">seuusername</span>
              <button className="ml-2 px-2 py-0.5 border border-white text-xs font-semibold rounded">
                Seguir
              </button>
            </div>
            
            {/* Caption */}
            <p className="text-sm line-clamp-2">
              {caption || 'Legenda do seu Reel...'}
            </p>

            {/* Hashtags */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {hashtags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="text-sm text-blue-400">{tag}</span>
                ))}
              </div>
            )}
            
            {/* Music */}
            <div className="flex items-center gap-2 mt-2">
              <Music2 className="w-3 h-3" />
              <span className="text-xs text-zinc-300">seuusername • Áudio original</span>
            </div>
          </div>
        </div>
      </div>

      {/* Character count */}
      <div className="p-2 border-t border-zinc-800 flex justify-between items-center">
        <span className="text-xs text-zinc-500">Instagram Reel</span>
        <span className={`text-xs ${caption.length > maxCaptionLength ? 'text-red-500' : 'text-zinc-500'}`}>
          {caption.length}/{maxCaptionLength}
        </span>
      </div>
    </Card>
  );
}
