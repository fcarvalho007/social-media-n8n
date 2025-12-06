import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, MessageCircle, Share2, Globe, MoreHorizontal, Play, X } from 'lucide-react';
import { PostFormat } from '@/types/social';

interface FacebookPreviewProps {
  mediaUrls: string[];
  caption: string;
  format: 'facebook_image' | 'facebook_stories' | 'facebook_reel';
}

export default function FacebookPreview({ mediaUrls, caption, format }: FacebookPreviewProps) {
  const maxCaptionLength = format === 'facebook_stories' ? 250 : 63206;
  const isVertical = format === 'facebook_stories' || format === 'facebook_reel';

  // Stories/Reel view (9:16)
  if (isVertical) {
    return (
      <Card className="overflow-hidden bg-black text-white max-w-[280px] mx-auto border-0">
        {/* 9:16 Aspect ratio container */}
        <div className="relative" style={{ paddingBottom: '177.78%' }}>
          <div className="absolute inset-0">
            {/* Media */}
            {mediaUrls[0] ? (
              <div className="w-full h-full relative">
                {format === 'facebook_reel' ? (
                  <video 
                    src={mediaUrls[0]} 
                    className="w-full h-full object-cover"
                    muted
                    loop
                  />
                ) : (
                  <img 
                    src={mediaUrls[0]} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                )}
                {format === 'facebook_reel' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1877F2] to-[#0D47A1] flex items-center justify-center">
                <div className="text-center text-white/70">
                  <Play className="w-12 h-12 mx-auto mb-2" />
                  <span className="text-sm">{format === 'facebook_reel' ? 'Reel' : 'Story'}</span>
                </div>
              </div>
            )}

            {/* Stories header */}
            <div className="absolute top-0 left-0 right-0 p-3">
              {/* Progress bar */}
              <div className="h-0.5 bg-white/30 rounded-full mb-3">
                <div className="h-full bg-white w-1/3 rounded-full"></div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center text-xs font-bold">
                    f
                  </div>
                  <div>
                    <span className="font-medium text-sm">Sua Página</span>
                    <span className="text-xs text-white/70 ml-2">agora</span>
                  </div>
                </div>
                <button className="p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Reel side buttons */}
            {format === 'facebook_reel' && (
              <div className="absolute right-3 bottom-32 flex flex-col items-center gap-4">
                <button className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <ThumbsUp className="w-5 h-5" />
                  </div>
                  <span className="text-xs">Gosto</span>
                </button>
                
                <button className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs">123</span>
                </button>
                
                <button className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs">Partilhar</span>
                </button>
              </div>
            )}

            {/* Format badge */}
            <div className="absolute top-14 left-3">
              <Badge className="bg-[#1877F2] hover:bg-[#1877F2] text-white border-0 text-xs">
                {format === 'facebook_reel' ? 'Reel' : 'Story'}
              </Badge>
            </div>

            {/* Bottom caption */}
            {caption && (
              <div className="absolute bottom-0 left-0 right-14 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-sm line-clamp-2">{caption}</p>
              </div>
            )}
          </div>
        </div>

        {/* Character count */}
        <div className="p-2 border-t border-zinc-800 flex justify-between items-center">
          <span className="text-xs text-zinc-500">Facebook {format === 'facebook_reel' ? 'Reel' : 'Stories'}</span>
          <span className={`text-xs ${caption.length > maxCaptionLength ? 'text-red-500' : 'text-zinc-500'}`}>
            {caption.length}/{maxCaptionLength}
          </span>
        </div>
      </Card>
    );
  }

  // Regular post view
  return (
    <Card className="overflow-hidden bg-card max-w-[400px] mx-auto">
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white font-bold">
            f
          </div>
          <div>
            <div className="font-semibold text-sm text-foreground">Sua Página</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Agora</span>
              <span>•</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
        </div>
        <button className="text-muted-foreground">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Caption */}
      {caption && (
        <div className="px-3 pb-3">
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {caption.length > 300 ? (
              <>
                {caption.slice(0, 300)}...
                <button className="text-muted-foreground ml-1">Ver mais</button>
              </>
            ) : caption}
          </p>
        </div>
      )}

      {/* Media */}
      {mediaUrls.length > 0 && (
        <div className="relative">
          {mediaUrls.length === 1 ? (
            <img 
              src={mediaUrls[0]} 
              alt="Post" 
              className="w-full aspect-square object-cover"
            />
          ) : (
            <div className="grid grid-cols-2 gap-0.5">
              {mediaUrls.slice(0, 4).map((url, index) => (
                <div key={index} className="relative aspect-square">
                  <img 
                    src={url} 
                    alt={`Post ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                  {index === 3 && mediaUrls.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">+{mediaUrls.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reaction counts */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 rounded-full bg-[#1877F2] flex items-center justify-center">
              <ThumbsUp className="w-3 h-3 text-white" />
            </div>
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">
              ❤️
            </div>
          </div>
          <span className="text-xs text-muted-foreground ml-1">0</span>
        </div>
        <span className="text-xs text-muted-foreground">0 comentários • 0 partilhas</span>
      </div>

      {/* Actions */}
      <div className="px-3 py-1 flex items-center justify-around">
        <button className="flex items-center gap-2 py-2 px-4 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
          <ThumbsUp className="w-5 h-5" />
          <span className="text-sm font-medium">Gosto</span>
        </button>
        <button className="flex items-center gap-2 py-2 px-4 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Comentar</span>
        </button>
        <button className="flex items-center gap-2 py-2 px-4 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
          <Share2 className="w-5 h-5" />
          <span className="text-sm font-medium">Partilhar</span>
        </button>
      </div>

      {/* Character count */}
      <div className="px-3 py-2 border-t border-border flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Facebook Post</span>
        <span className={`text-xs ${caption.length > maxCaptionLength ? 'text-destructive' : 'text-muted-foreground'}`}>
          {caption.length.toLocaleString()}/{maxCaptionLength.toLocaleString()}
        </span>
      </div>
    </Card>
  );
}
