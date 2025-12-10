import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SocialNetwork, PostFormat, PostFormatConfig } from '@/types/social';
import { FormatCard } from './FormatCard';
import { getPlatformConfig, PlatformIcon } from './platformConfig';

interface FormatsPanelProps {
  platform: SocialNetwork;
  formats: PostFormatConfig[];
  selectedFormats: PostFormat[];
  onToggleFormat: (format: PostFormat) => void;
  onClose: () => void;
}

export function FormatsPanel({ 
  platform, 
  formats, 
  selectedFormats, 
  onToggleFormat, 
  onClose 
}: FormatsPanelProps) {
  const config = getPlatformConfig(platform);
  
  return (
    <div 
      className="formats-panel mt-4 p-5 rounded-2xl border overflow-hidden animate-slide-down"
      style={{
        background: `linear-gradient(to bottom, ${config.colorHex}08, transparent)`,
        borderColor: config.colorHex,
      }}
      role="tabpanel"
      aria-labelledby={`tab-${platform}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={platform} className="w-[18px] h-[18px]" colored />
          <span className="font-semibold text-[15px] text-foreground">
            {config.name}
          </span>
          <span className="text-muted-foreground text-[15px]">
            — Seleciona os formatos
          </span>
        </div>
        
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "w-8 h-8 rounded-lg border-0",
            "bg-card hover:bg-accent",
            "flex items-center justify-center",
            "text-muted-foreground hover:text-foreground",
            "transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          aria-label="Fechar painel de formatos"
        >
          <X className="w-[18px] h-[18px]" />
        </button>
      </div>
      
      {/* Formats Grid */}
      <div 
        className="grid gap-3"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        }}
        role="group"
        aria-label="Formatos disponíveis"
      >
        {formats.map((format) => (
          <FormatCard
            key={format.format}
            format={format}
            isSelected={selectedFormats.includes(format.format)}
            onToggle={() => onToggleFormat(format.format)}
            platformColor={config.colorHex}
          />
        ))}
      </div>
    </div>
  );
}
