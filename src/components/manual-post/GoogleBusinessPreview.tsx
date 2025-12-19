import { MapPin, Phone, Navigation, Globe, Star, Clock, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoogleBusinessPreviewProps {
  mediaUrls: string[];
  caption: string;
  format?: 'googlebusiness_post' | 'googlebusiness_media';
}

export default function GoogleBusinessPreview({ 
  mediaUrls, 
  caption, 
  format = 'googlebusiness_post' 
}: GoogleBusinessPreviewProps) {
  const hasMedia = mediaUrls.length > 0;
  const isVideo = hasMedia && (
    mediaUrls[0]?.includes('video') || 
    mediaUrls[0]?.endsWith('.mp4') ||
    mediaUrls[0]?.endsWith('.webm')
  );
  const maxChars = 1500;
  const charCount = caption.length;
  const isOverLimit = charCount > maxChars;

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Google Business Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden border border-border">
        {/* Business Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-start gap-3">
            {/* Business Avatar */}
            <div className="w-12 h-12 rounded-full bg-[#4285F4] flex items-center justify-center flex-shrink-0">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm truncate">O Meu Negócio</h3>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground ml-1">5.0 (128)</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Aberto agora
              </p>
            </div>
          </div>
        </div>

        {/* Media Section */}
        {hasMedia && (
          <div className="relative aspect-square bg-muted">
            {isVideo ? (
              <div className="relative w-full h-full">
                <video 
                  src={mediaUrls[0]} 
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Play className="h-7 w-7 text-[#4285F4] ml-1" fill="currentColor" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                  0:30
                </div>
              </div>
            ) : (
              <img 
                src={mediaUrls[0]} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Format Badge */}
            <div className="absolute top-2 left-2">
              <span className="bg-[#4285F4] text-white text-xs font-medium px-2 py-1 rounded-full">
                {format === 'googlebusiness_media' ? (isVideo ? 'Vídeo' : 'Foto') : 'Post'}
              </span>
            </div>
          </div>
        )}

        {/* Caption/Post Content */}
        {caption && (
          <div className="p-4">
            <p className={cn(
              "text-sm text-foreground whitespace-pre-wrap break-words",
              isOverLimit && "text-destructive"
            )}>
              {caption.slice(0, 300)}
              {caption.length > 300 && (
                <span className="text-muted-foreground">... ver mais</span>
              )}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!hasMedia && !caption && (
          <div className="p-8 flex flex-col items-center justify-center text-muted-foreground">
            <MapPin className="h-12 w-12 mb-3 text-[#4285F4]/30" />
            <p className="text-sm">Adicione conteúdo para visualizar</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-3 border-t border-border/50 flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-[#4285F4] text-white text-xs font-medium hover:bg-[#3b78e7] transition-colors">
            <Phone className="h-3.5 w-3.5" />
            Ligar
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-[#4285F4] text-[#4285F4] text-xs font-medium hover:bg-[#4285F4]/10 transition-colors">
            <Navigation className="h-3.5 w-3.5" />
            Direções
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors">
            <Globe className="h-3.5 w-3.5" />
            Website
          </button>
        </div>

        {/* Character Counter */}
        <div className={cn(
          "px-4 pb-3 text-xs text-right",
          isOverLimit ? "text-destructive" : "text-muted-foreground"
        )}>
          {charCount}/{maxChars} caracteres
        </div>
      </div>

      {/* Google Maps Attribution */}
      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#4285F4"/>
          <circle cx="12" cy="9" r="2.5" fill="white"/>
        </svg>
        <span>Google Business Profile</span>
      </div>
    </div>
  );
}
