import { Image, Play, FileText, Clock, Music2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormatIllustrationProps {
  type: string;
  platformColor?: string;
}

export function FormatIllustration({ type, platformColor = '#6B7280' }: FormatIllustrationProps) {
  const illustrations: Record<string, JSX.Element> = {
    // Instagram Carousel
    'carousel': (
      <div className="relative w-11 h-11">
        <div 
          className="absolute w-7 h-7 rounded border bg-gradient-to-br from-muted to-muted/50"
          style={{ top: 0, left: 0, borderColor: '#D1D5DB' }}
        />
        <div 
          className="absolute w-7 h-7 rounded border bg-gradient-to-br from-muted to-muted/50"
          style={{ top: 4, left: 4, borderColor: '#D1D5DB' }}
        />
        <div 
          className="absolute w-7 h-7 rounded border bg-gradient-to-br from-muted to-muted/50"
          style={{ top: 8, left: 8, borderColor: '#D1D5DB' }}
        />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1">
          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: platformColor }} />
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        </div>
      </div>
    ),
    
    // Instagram Post
    'post': (
      <div className="w-11 h-11 rounded-lg border border-muted bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
        <Image className="w-5 h-5 text-muted-foreground" />
      </div>
    ),
    
    // Stories
    'stories': (
      <div className="relative">
        <div className="w-7 h-11 bg-gradient-to-b from-foreground/90 to-foreground/70 rounded-md p-1">
          <div className="flex gap-0.5 mb-1">
            <span className="flex-1 h-0.5 bg-white rounded-full" />
            <span className="flex-1 h-0.5 bg-white/30 rounded-full" />
            <span className="flex-1 h-0.5 bg-white/30 rounded-full" />
          </div>
        </div>
        <Clock 
          className="absolute -bottom-1 -right-1 w-3 h-3" 
          style={{ color: '#F59E0B' }}
        />
      </div>
    ),
    
    // Reels
    'reels': (
      <div className="relative">
        <div className="w-7 h-11 bg-gradient-to-b from-foreground/90 to-foreground/70 rounded-md flex items-center justify-center">
          <Play className="w-4 h-4 text-white" fill="currentColor" />
        </div>
        <Music2 
          className="absolute -bottom-0.5 -right-1.5 w-3 h-3"
          style={{ color: platformColor }}
        />
      </div>
    ),
    
    // LinkedIn Post
    'linkedin-post': (
      <div className="w-11 h-11 rounded-lg border border-muted bg-card p-1.5 flex flex-col gap-1">
        <div className="space-y-0.5">
          <div className="h-1 w-full bg-muted-foreground/20 rounded" />
          <div className="h-1 w-3/4 bg-muted-foreground/20 rounded" />
        </div>
        <div className="flex-1 bg-muted/50 rounded" />
      </div>
    ),
    
    // LinkedIn PDF
    'linkedin-pdf': (
      <div className="relative" style={{ color: '#0A66C2' }}>
        <FileText className="w-6 h-6" />
        <div className="absolute -bottom-1 -right-2 flex">
          <span className="w-3 h-3 bg-[#0A66C2] rounded-sm text-[6px] text-white flex items-center justify-center font-semibold border border-white">1</span>
          <span className="w-3 h-3 bg-[#0A66C2] rounded-sm text-[6px] text-white flex items-center justify-center font-semibold border border-white -ml-1">2</span>
          <span className="w-3 h-3 bg-[#0A66C2] rounded-sm text-[6px] text-white flex items-center justify-center font-semibold border border-white -ml-1">3</span>
        </div>
      </div>
    ),
    
    // YouTube Video
    'youtube-video': (
      <div className="w-11 h-8 bg-foreground/90 rounded flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <Play className="w-3 h-3 text-white ml-0.5" fill="currentColor" />
          </div>
        </div>
        <div className="h-1 mx-1 mb-1 bg-red-500/50 rounded-full">
          <div className="h-full w-1/3 bg-red-500 rounded-full" />
        </div>
      </div>
    ),
    
    // YouTube Shorts
    'youtube-shorts': (
      <div className="relative">
        <div className="w-6 h-10 bg-gradient-to-b from-red-500 to-red-600 rounded-md flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" fill="currentColor" />
        </div>
      </div>
    ),
    
    // TikTok Video
    'tiktok-video': (
      <div className="relative">
        <div className="w-7 h-11 bg-foreground rounded-md flex items-center justify-center overflow-hidden">
          <Play className="w-4 h-4 text-white" fill="currentColor" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-pink-500" />
        </div>
      </div>
    ),
    
    // Facebook Post
    'facebook-post': (
      <div className="w-11 h-11 rounded-lg border border-muted bg-card p-1.5 flex flex-col gap-1">
        <div className="h-1 w-full bg-muted-foreground/20 rounded" />
        <div className="flex-1 bg-blue-500/10 rounded flex items-center justify-center">
          <Image className="w-4 h-4 text-blue-500/50" />
        </div>
      </div>
    ),
    
    // Facebook Stories
    'facebook-stories': (
      <div className="relative">
        <div className="w-7 h-11 bg-gradient-to-b from-blue-500 to-blue-600 rounded-md p-1">
          <div className="flex gap-0.5 mb-1">
            <span className="flex-1 h-0.5 bg-white rounded-full" />
            <span className="flex-1 h-0.5 bg-white/30 rounded-full" />
          </div>
        </div>
        <Clock 
          className="absolute -bottom-1 -right-1 w-3 h-3" 
          style={{ color: '#F59E0B' }}
        />
      </div>
    ),
    
    // Facebook Reel
    'facebook-reel': (
      <div className="relative">
        <div className="w-7 h-11 bg-gradient-to-b from-blue-500 to-purple-500 rounded-md flex items-center justify-center">
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
