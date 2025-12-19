import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostFormat } from '@/types/social';
import { getFormatConfig } from '@/types/social';

interface FormatPreset {
  id: string;
  name: string;
  description: string;
  emoji: string;
  formats: PostFormat[];
  gradient: string;
}

const FORMAT_PRESETS: FormatPreset[] = [
  {
    id: 'carousel-multi',
    name: 'Carrossel Multi-plataforma',
    description: 'Instagram Carrossel + LinkedIn PDF',
    emoji: '🎠',
    formats: ['instagram_carousel', 'linkedin_document'],
    gradient: 'linear-gradient(135deg, #E1306C, #0A66C2)',
  },
  {
    id: 'video-vertical',
    name: 'Vídeo Vertical 9:16',
    description: 'Reels + Shorts + TikTok',
    emoji: '📱',
    formats: ['instagram_reel', 'facebook_reel', 'youtube_shorts', 'tiktok_video'],
    gradient: 'linear-gradient(135deg, #E1306C, #FF0000, #000000)',
  },
  {
    id: 'post-standard',
    name: 'Post Standard',
    description: 'Todas as redes (imagem)',
    emoji: '📝',
    formats: ['instagram_image', 'linkedin_post', 'facebook_image', 'googlebusiness_post'],
    gradient: 'linear-gradient(135deg, #E1306C, #0A66C2, #1877F2, #4285F4)',
  },
  {
    id: 'stories-all',
    name: 'Stories Everywhere',
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
    <div className="quick-presets mb-5">
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles size={14} className="text-amber-500" />
        <span className="text-[13px] font-medium text-muted-foreground">Seleção rápida:</span>
      </div>
      
      <div className="flex gap-2.5 flex-wrap">
        {FORMAT_PRESETS.map(preset => {
          const isActive = isPresetActive(preset);
          const isPartial = isPresetPartial(preset);
          
          return (
            <button
              key={preset.id}
              type="button"
              className={cn(
                "preset-card",
                "relative flex items-center gap-2.5 px-3.5 py-2.5",
                "bg-card border-2 rounded-xl",
                "cursor-pointer transition-all duration-200",
                "hover:shadow-lg hover:-translate-y-0.5",
                "text-left min-w-[180px]",
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
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
              
              {/* Emoji */}
              <span className="text-2xl leading-none">{preset.emoji}</span>
              
              {/* Text */}
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-[13px] text-foreground">{preset.name}</span>
                <span className="text-[11px] text-muted-foreground">{preset.description}</span>
              </div>
              
              {/* Tooltip */}
              {hoveredPreset === preset.id && (
                <div className="preset-tooltip">
                  Inclui: {getFormatNames(preset.formats)}
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="presets-divider">
        <span>ou seleciona manualmente</span>
      </div>
    </div>
  );
}
