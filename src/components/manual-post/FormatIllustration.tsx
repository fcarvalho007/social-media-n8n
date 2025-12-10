import { Image, Play, FileText, Clock, Music2, Zap, Mountain, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormatIllustrationProps {
  type: string;
  platformColor?: string;
  isSelected?: boolean;
}

export function FormatIllustration({ type, platformColor = '#6B7280', isSelected = false }: FormatIllustrationProps) {
  const illustrations: Record<string, JSX.Element> = {
    // Instagram Carousel - Stacked cards with dots
    'carousel': (
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="relative w-9 h-8">
          {/* Stacked cards */}
          <div 
            className={cn(
              "absolute w-6 h-6 rounded border-[1.5px] bg-gradient-to-br from-muted/80 to-muted/40",
              isSelected && "from-[var(--card-bg)] to-[var(--card-bg)]"
            )}
            style={{ 
              top: 0, 
              left: 0, 
              zIndex: 3,
              borderColor: isSelected ? platformColor : '#D1D5DB',
              '--card-bg': `${platformColor}15`,
            } as React.CSSProperties}
          />
          <div 
            className="absolute w-6 h-6 rounded border-[1.5px] bg-gradient-to-br from-muted/60 to-muted/30"
            style={{ top: 2, left: 5, zIndex: 2, borderColor: '#D1D5DB' }}
          />
          <div 
            className="absolute w-6 h-6 rounded border-[1.5px] bg-gradient-to-br from-muted/40 to-muted/20"
            style={{ top: 4, left: 10, zIndex: 1, borderColor: '#D1D5DB' }}
          />
        </div>
        {/* Dots indicator */}
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-[3px]">
          <span 
            className="h-1 rounded-full transition-all"
            style={{ 
              width: isSelected ? 8 : 4, 
              backgroundColor: platformColor 
            }} 
          />
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        </div>
      </div>
    ),
    
    // Instagram Post - Frame with landscape icon
    'post': (
      <div 
        className={cn(
          "w-11 h-11 rounded-lg border-[1.5px] bg-gradient-to-br flex items-center justify-center",
          isSelected ? "from-[var(--bg-light)] to-[var(--bg-lighter)]" : "from-muted/50 to-muted"
        )}
        style={{ 
          borderColor: isSelected ? platformColor : 'hsl(var(--border))',
          '--bg-light': `${platformColor}10`,
          '--bg-lighter': `${platformColor}05`,
        } as React.CSSProperties}
      >
        <div className="relative">
          <Mountain className="w-5 h-5 text-muted-foreground" />
          <Sun 
            className="absolute -top-0.5 -right-1 w-2.5 h-2.5" 
            style={{ color: isSelected ? platformColor : '#9CA3AF' }}
          />
        </div>
      </div>
    ),
    
    // Stories - Phone with progress bars and 24h badge
    'stories': (
      <div className="relative">
        <div 
          className="w-7 h-11 rounded-md p-1 flex flex-col gap-1"
          style={{ 
            background: `linear-gradient(180deg, ${isSelected ? platformColor : '#374151'}, ${isSelected ? `${platformColor}cc` : '#1F2937'})` 
          }}
        >
          {/* Progress bars */}
          <div className="flex gap-0.5">
            <span className="flex-1 h-[3px] bg-white rounded-full" />
            <span 
              className="flex-1 h-[3px] rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.3)' }}
            >
              <span className="block h-full w-3/5 bg-white rounded-full" />
            </span>
            <span className="flex-1 h-[3px] bg-white/30 rounded-full" />
          </div>
          {/* Content area */}
          <div className="flex-1 bg-white/10 rounded-sm" />
        </div>
        {/* 24h badge */}
        <div 
          className="absolute -bottom-1 -right-2 px-1 py-0.5 rounded text-[8px] font-bold text-amber-600 bg-white shadow-sm"
        >
          24h
        </div>
      </div>
    ),
    
    // Reels - Vertical video with music note
    'reels': (
      <div className="relative">
        <div 
          className="w-7 h-11 rounded-md flex items-center justify-center"
          style={{ 
            background: `linear-gradient(180deg, ${platformColor}, ${platformColor}aa)` 
          }}
        >
          <Play className="w-4 h-4 text-white" fill="currentColor" />
        </div>
        {/* Animated music note */}
        <div 
          className="absolute -bottom-0.5 -right-2 w-[18px] h-[18px] bg-white rounded-full flex items-center justify-center shadow-md animate-bounce-subtle"
          style={{ color: platformColor }}
        >
          <Music2 size={11} />
        </div>
      </div>
    ),
    
    // LinkedIn Post - Text lines with image area
    'linkedin-post': (
      <div 
        className={cn(
          "w-11 h-11 rounded-lg border-[1.5px] bg-card p-1.5 flex flex-col gap-1",
          isSelected && "bg-[var(--bg-light)]"
        )}
        style={{ 
          borderColor: isSelected ? platformColor : 'hsl(var(--border))',
          '--bg-light': `${platformColor}08`,
        } as React.CSSProperties}
      >
        {/* Text lines */}
        <div className="space-y-[3px]">
          <div 
            className="h-[3px] w-full rounded" 
            style={{ backgroundColor: isSelected ? `${platformColor}40` : 'hsl(var(--muted))' }}
          />
          <div 
            className="h-[3px] w-3/4 rounded" 
            style={{ backgroundColor: isSelected ? `${platformColor}30` : 'hsl(var(--muted))' }}
          />
        </div>
        {/* Image area */}
        <div 
          className="flex-1 rounded flex items-center justify-center"
          style={{ backgroundColor: isSelected ? `${platformColor}15` : 'hsl(var(--muted) / 0.5)' }}
        >
          <Image className="w-3 h-3" style={{ color: isSelected ? platformColor : 'hsl(var(--muted-foreground))' }} />
        </div>
      </div>
    ),
    
    // LinkedIn PDF - Stacked numbered pages
    'linkedin-pdf': (
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="relative w-9 h-10">
          {/* Stacked pages */}
          {[3, 2, 1].map((num, i) => (
            <div 
              key={num}
              className="absolute w-6 h-7 bg-white rounded-sm border flex items-end justify-end p-0.5"
              style={{ 
                top: i * 3, 
                left: i * 4, 
                zIndex: 3 - i,
                borderColor: platformColor,
              }}
            >
              <span 
                className="text-[7px] font-bold"
                style={{ color: platformColor }}
              >
                {num}
              </span>
            </div>
          ))}
        </div>
        {/* PDF icon */}
        <FileText 
          className="absolute top-0.5 left-1 w-4 h-4" 
          style={{ color: platformColor }}
        />
      </div>
    ),
    
    // YouTube Video - Player with timeline
    'youtube-video': (
      <div className="w-11 h-7 bg-foreground/90 rounded overflow-hidden flex flex-col">
        {/* Video area with play button */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-[14px] bg-red-500 rounded-sm flex items-center justify-center">
            <Play className="w-2.5 h-2.5 text-white ml-0.5" fill="currentColor" />
          </div>
        </div>
        {/* Timeline */}
        <div className="h-1 mx-0.5 mb-0.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full w-2/5 bg-red-500 rounded-full" />
        </div>
      </div>
    ),
    
    // YouTube Shorts - Vertical with bolt icon
    'youtube-shorts': (
      <div className="relative">
        <div className="w-6 h-10 bg-gradient-to-b from-red-500 to-red-600 rounded-md flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" fill="currentColor" />
        </div>
        {/* Duration badge */}
        <div className="absolute -bottom-1 -right-1 px-1 py-0.5 bg-red-500 rounded text-[7px] font-bold text-white">
          ≤60s
        </div>
      </div>
    ),
    
    // TikTok Video - Phone with signature gradient
    'tiktok-video': (
      <div className="relative">
        <div className="w-7 h-11 bg-black rounded-md flex items-center justify-center overflow-hidden">
          <Play className="w-4 h-4 text-white" fill="currentColor" />
          {/* TikTok gradient bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500" />
        </div>
        {/* Music note */}
        <div className="absolute -bottom-0.5 -right-2 w-[18px] h-[18px] bg-white rounded-full flex items-center justify-center shadow-md animate-bounce-subtle">
          <Music2 size={11} className="text-black" />
        </div>
      </div>
    ),
    
    // Facebook Post
    'facebook-post': (
      <div 
        className={cn(
          "w-11 h-11 rounded-lg border-[1.5px] bg-card p-1.5 flex flex-col gap-1",
          isSelected && "bg-[var(--bg-light)]"
        )}
        style={{ 
          borderColor: isSelected ? platformColor : 'hsl(var(--border))',
          '--bg-light': `${platformColor}08`,
        } as React.CSSProperties}
      >
        <div 
          className="h-[3px] w-full rounded" 
          style={{ backgroundColor: isSelected ? `${platformColor}40` : 'hsl(var(--muted))' }}
        />
        <div 
          className="flex-1 rounded flex items-center justify-center"
          style={{ backgroundColor: isSelected ? `${platformColor}15` : `${platformColor}10` }}
        >
          <Image className="w-4 h-4" style={{ color: `${platformColor}60` }} />
        </div>
      </div>
    ),
    
    // Facebook Stories
    'facebook-stories': (
      <div className="relative">
        <div 
          className="w-7 h-11 rounded-md p-1 flex flex-col gap-1"
          style={{ 
            background: `linear-gradient(180deg, ${platformColor}, ${platformColor}bb)` 
          }}
        >
          <div className="flex gap-0.5">
            <span className="flex-1 h-[3px] bg-white rounded-full" />
            <span className="flex-1 h-[3px] bg-white/30 rounded-full" />
          </div>
          <div className="flex-1 bg-white/10 rounded-sm" />
        </div>
        <div className="absolute -bottom-1 -right-2 px-1 py-0.5 rounded text-[8px] font-bold text-amber-600 bg-white shadow-sm">
          24h
        </div>
      </div>
    ),
    
    // Facebook Reel
    'facebook-reel': (
      <div className="relative">
        <div 
          className="w-7 h-11 rounded-md flex items-center justify-center"
          style={{ background: `linear-gradient(180deg, ${platformColor}, #8B5CF6)` }}
        >
          <Play className="w-4 h-4 text-white" fill="currentColor" />
        </div>
      </div>
    ),
  };

  return illustrations[type] || (
    <div className="w-11 h-11 rounded-lg border border-muted bg-muted/50 flex items-center justify-center">
      <Image className="w-5 h-5 text-muted-foreground" />
    </div>
  );
}

// Map format to illustration type
export function getIllustrationType(format: string): string {
  const mapping: Record<string, string> = {
    'instagram_carousel': 'carousel',
    'instagram_image': 'post',
    'instagram_stories': 'stories',
    'instagram_reel': 'reels',
    'linkedin_post': 'linkedin-post',
    'linkedin_document': 'linkedin-pdf',
    'youtube_video': 'youtube-video',
    'youtube_shorts': 'youtube-shorts',
    'tiktok_video': 'tiktok-video',
    'facebook_image': 'facebook-post',
    'facebook_stories': 'facebook-stories',
    'facebook_reel': 'facebook-reel',
  };
  return mapping[format] || 'post';
}
