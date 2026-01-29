import { useState } from 'react';
import { Check, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostFormat } from '@/types/social';
import { getFormatConfig } from '@/types/social';

interface FormatPreset {
  id: string;
  name: string;
  shortName: string;
  description: string;
  emoji: string;
  formats: PostFormat[];
  gradient: string;
}

const FORMAT_PRESETS: FormatPreset[] = [
  {
    id: 'carousel-multi',
    name: 'Carrossel Multi-plataforma',
    shortName: 'Carrossel',
    description: 'Instagram Carrossel + LinkedIn PDF',
    emoji: '🎠',
    formats: ['instagram_carousel', 'linkedin_document'],
    gradient: 'linear-gradient(135deg, #E1306C, #0A66C2)',
  },
  {
    id: 'video-vertical',
    name: 'Vídeo Vertical 9:16',
    shortName: 'Vídeo 9:16',
    description: 'Reels + Shorts + TikTok',
    emoji: '📱',
    formats: ['instagram_reel', 'facebook_reel', 'youtube_shorts', 'tiktok_video'],
    gradient: 'linear-gradient(135deg, #E1306C, #FF0000, #000000)',
  },
  {
    id: 'post-standard',
    name: 'Post Standard',
    shortName: 'Post',
    description: 'Todas as redes (imagem)',
    emoji: '📝',
    formats: ['instagram_image', 'linkedin_post', 'facebook_image', 'googlebusiness_post'],
    gradient: 'linear-gradient(135deg, #E1306C, #0A66C2, #1877F2, #4285F4)',
  },
  {
    id: 'stories-all',
    name: 'Stories Everywhere',
    shortName: 'Stories',
    description: 'IG + FB Stories + Google Business',
    emoji: '⏱️',
    formats: ['instagram_stories', 'facebook_stories', 'googlebusiness_post'],
    gradient: 'linear-gradient(135deg, #E1306C, #1877F2, #4285F4)',
  },
];

interface QuickPresetsProps {
  selectedFormats: PostFormat[];
  onSelectPreset: (formatIds: PostFormat[]) => void;
}

export function QuickPresets({ selectedFormats, onSelectPreset }: QuickPresetsProps) {
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);

  // Check if preset is active (all formats selected)
  const isPresetActive = (preset: FormatPreset) => {
    return preset.formats.every(f => selectedFormats.includes(f));
  };

  // Check if preset is partially active
  const isPresetPartial = (preset: FormatPreset) => {
    const selected = preset.formats.filter(f => selectedFormats.includes(f));
    return selected.length > 0 && selected.length < preset.formats.length;
  };

  const handlePresetClick = (preset: FormatPreset) => {
    if (isPresetActive(preset)) {
      // Remove all formats from preset
      onSelectPreset(selectedFormats.filter(f => !preset.formats.includes(f)));
    } else {
      // Add formats without duplicates
      const newFormats = [...new Set([...selectedFormats, ...preset.formats])] as PostFormat[];
      onSelectPreset(newFormats);
    }
  };

  const getFormatNames = (formats: PostFormat[]) => {
    return formats.map(f => getFormatConfig(f)?.label || f).join(', ');
  };

  return (
    <div className="quick-presets mb-2 sm:mb-5 overflow-hidden w-full max-w-[calc(100vw-8px)] sm:max-w-full">
      <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2 px-0">
        <Sparkles size={12} className="text-amber-500 sm:w-[14px] sm:h-[14px]" />
        <span className="text-[10px] sm:text-[13px] font-medium text-muted-foreground">Seleção rápida:</span>
      </div>
      
      {/* Horizontal scrollable - no negative margins to prevent overflow */}
      <div className="relative overflow-hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible scrollbar-hide snap-x snap-mandatory">
          {FORMAT_PRESETS.map(preset => {
            const isActive = isPresetActive(preset);
            const isPartial = isPresetPartial(preset);
            
            return (
              <button
                key={preset.id}
                type="button"
                className={cn(
                  "preset-card snap-start",
                  "relative flex items-center gap-1.5 xs:gap-2 px-2 py-1.5 xs:px-2.5 xs:py-2 sm:px-3.5 sm:py-2.5",
                  "min-h-[44px] xs:min-h-[48px] sm:min-h-0",
                  "bg-card border-2 rounded-lg sm:rounded-xl",
                  "cursor-pointer transition-all duration-200",
                  "hover:shadow-lg hover:-translate-y-0.5",
                  "text-left w-[80px] xs:w-[100px] flex-shrink-0 sm:w-auto sm:min-w-[180px] sm:flex-shrink",
                  isActive && "preset-card-active",
                  isPartial && "preset-card-partial"
                )}
                style={{ 
                  '--preset-gradient': preset.gradient,
                  borderColor: isActive ? 'transparent' : isPartial ? 'hsl(var(--muted-foreground))' : 'hsl(var(--border))',
                  background: isActive 
                    ? `linear-gradient(white, white) padding-box, ${preset.gradient} border-box`
                    : undefined,
                } as React.CSSProperties}
                onClick={() => handlePresetClick(preset)}
                onMouseEnter={() => setHoveredPreset(preset.id)}
                onMouseLeave={() => setHoveredPreset(null)}
              >
                {/* Check badge */}
                {isActive && (
                  <div className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 w-3.5 h-3.5 sm:w-5 sm:h-5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md">
                    <Check size={8} className="text-white sm:w-3 sm:h-3" strokeWidth={3} />
                  </div>
                )}
                
                {/* Emoji */}
                <span className="text-base sm:text-2xl leading-none">{preset.emoji}</span>
                
                {/* Text - Short name on mobile */}
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="font-semibold text-[11px] sm:text-[13px] text-foreground leading-tight truncate">
                    {preset.shortName}
                  </span>
                  <span className="text-[9px] sm:text-[11px] text-muted-foreground leading-tight truncate hidden sm:block">{preset.description}</span>
                </div>
                
                {/* Tooltip - desktop only */}
                {hoveredPreset === preset.id && (
                  <div className="preset-tooltip hidden sm:block">
                    Inclui: {getFormatNames(preset.formats)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Scroll indicator - mobile only */}
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden flex items-center justify-end pr-1">
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </div>
      
      <div className="presets-divider mt-2 sm:mt-4">
        <span className="text-[10px] sm:text-xs text-center">ou seleciona manualmente</span>
      </div>
    </div>
  );
}
