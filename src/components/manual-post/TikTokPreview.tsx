import { Card } from '@/components/ui/card';
import { Heart, MessageCircle, Bookmark, Share2, Music2, Plus, Play } from 'lucide-react';
import { NETWORK_CONSTRAINTS } from '@/lib/socialNetworks';

interface TikTokPreviewProps {
  mediaUrl?: string;
  caption: string;
}

export default function TikTokPreview({ mediaUrl, caption }: TikTokPreviewProps) {
  const maxCaptionLength = NETWORK_CONSTRAINTS.tiktok.max_caption_length;

  // Extract hashtags from caption
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
            <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-pink-950/20 to-zinc-900 flex items-center justify-center">
              <div className="text-center text-zinc-500">
                <Play className="w-12 h-12 mx-auto mb-2" />
                <span className="text-sm">Vídeo TikTok</span>
              </div>
            </div>
          )}

          {/* For You badge */}
          <div className="absolute top-3 left-0 right-0 flex justify-center gap-6">
            <span className="text-zinc-400 text-sm">Seguir</span>
            <span className="text-white text-sm font-semibold border-b-2 border-white pb-1">Para ti</span>
          </div>

          {/* Right side buttons */}
          <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
            {/* Profile with follow button */}
            <div className="relative mb-2">
              <div className="w-12 h-12 rounded-full bg-zinc-700 border-2 border-white overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  @
                </div>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#FE2C55] flex items-center justify-center">
                <Plus className="w-3 h-3" />
              </div>
            </div>

            <button className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 flex items-center justify-center">
                <Heart className="w-7 h-7" />
              </div>
              <span className="text-xs">1234</span>
            </button>
            
            <button className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 flex items-center justify-center">
                <MessageCircle className="w-7 h-7" />
              </div>
              <span className="text-xs">56</span>
            </button>
            
            <button className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 flex items-center justify-center">
                <Bookmark className="w-7 h-7" />
              </div>
              <span className="text-xs">89</span>
            </button>
            
            <button className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 flex items-center justify-center">
                <Share2 className="w-7 h-7" />
              </div>
              <span className="text-xs">Partilhar</span>
            </button>

            {/* Rotating disc */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-4 border-zinc-700 animate-spin-slow flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-zinc-600"></div>
            </div>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-14 p-3 bg-gradient-to-t from-black/80 to-transparent">
            {/* Username */}
            <div className="font-semibold text-sm mb-1">
              @seuusername
            </div>
            
            {/* Caption */}
            <p className="text-sm line-clamp-2 mb-2">
              {caption || 'Descrição do seu vídeo TikTok...'}
            </p>

            {/* Hashtags */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {hashtags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="text-sm font-medium">{tag}</span>
                ))}
              </div>
            )}
            
            {/* Music */}
            <div className="flex items-center gap-2">
              <Music2 className="w-3 h-3" />
              <div className="overflow-hidden flex-1">
                <span className="text-xs text-zinc-300 whitespace-nowrap animate-marquee">
                  Som original - @seuusername • Som original - @seuusername
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Character count */}
      <div className="p-2 border-t border-zinc-800 flex justify-between items-center">
        <span className="text-xs text-zinc-500">TikTok</span>
        <span className={`text-xs ${caption.length > maxCaptionLength ? 'text-red-500' : 'text-zinc-500'}`}>
          {caption.length}/{maxCaptionLength}
        </span>
      </div>
    </Card>
  );
}
