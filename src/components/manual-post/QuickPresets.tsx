import { useState } from 'react';
import { Check, Clock3, Image, Layers3, Sparkles, Video, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostFormat } from '@/types/social';
import { getFormatConfig } from '@/types/social';

interface FormatPreset {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  formats: PostFormat[];
}

const FORMAT_PRESETS: FormatPreset[] = [
  {
    id: 'carousel-multi',
    name: 'Carrossel Multi-plataforma',
    shortName: 'Carrossel',
    description: 'Instagram Carrossel + LinkedIn PDF',
    icon: Layers3,
    formats: ['instagram_carousel', 'linkedin_document'],
  },
  {
    id: 'video-vertical',
    name: 'Vídeo Vertical 9:16',
    shortName: 'Vídeo 9:16',
    description: 'Reels + Shorts + TikTok + LinkedIn',
    icon: Video,
    formats: ['instagram_reel', 'facebook_reel', 'youtube_shorts', 'tiktok_video', 'linkedin_post'],
  },
  {
    id: 'post-standard',
    name: 'Post Standard',
    shortName: 'Post',
    description: 'Todas as redes (imagem)',
    icon: Image,
    formats: ['instagram_image', 'linkedin_post', 'facebook_image', 'googlebusiness_post'],
  },
  {
    id: 'stories-all',
    name: 'Stories Everywhere',
    shortName: 'Stories',
    description: 'IG + FB Stories + Google Business',
    icon: Clock3,
    formats: ['instagram_stories', 'facebook_stories', 'googlebusiness_post'],
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
    <div className="quick-presets manual-field-stack w-full max-w-[calc(100vw-8px)] overflow-hidden sm:max-w-full">
      <div className="flex items-center gap-1.5 px-0">
        <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
        <span className="manual-field-label text-muted-foreground">Seleção rápida</span>
      </div>
      
      {/* Grid 2x2 on mobile, flex wrap on larger screens */}
      <div className="relative overflow-hidden">
        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:gap-2 sm:flex-wrap">
          {FORMAT_PRESETS.map(preset => {
            const isActive = isPresetActive(preset);
            const isPartial = isPresetPartial(preset);
            const Icon = preset.icon;
            
            return (
              <button
                key={preset.id}
                type="button"
                className={cn(
                  "preset-card",
                  "manual-option-button relative flex min-h-14 items-center gap-2 px-3 py-2.5",
                  "text-left w-full sm:w-auto sm:min-w-[180px]",
                  "hover:border-primary/40",
                  isActive && "border-primary bg-primary/10 text-foreground",
                  isPartial && "border-primary/50 bg-primary/5"
                )}
                onClick={() => handlePresetClick(preset)}
                onMouseEnter={() => setHoveredPreset(preset.id)}
                onMouseLeave={() => setHoveredPreset(null)}
              >
                {/* Check badge */}
                {isActive && (
                  <div className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary shadow-sm sm:-right-1.5 sm:-top-1.5 sm:h-5 sm:w-5">
                    <Check size={8} className="text-primary-foreground sm:w-3 sm:h-3" strokeWidth={3} />
                  </div>
                )}

                <span className={cn('manual-icon-box h-8 w-8', isActive && 'bg-primary text-primary-foreground')}>
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </span>
                
                {/* Text - Full name visible on mobile grid */}
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-xs font-semibold leading-tight text-foreground xs:text-[13px]">
                    {preset.shortName}
                  </span>
                  <span className="truncate text-[10px] leading-tight text-muted-foreground xs:text-[11px]">{preset.description}</span>
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
      </div>
      
      <div className="presets-divider pt-1">
        <span className="manual-microcopy text-center">ou seleciona manualmente</span>
      </div>
    </div>
  );
}
