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
      className="formats-panel mt-2 sm:mt-4 p-1.5 xs:p-2 sm:p-5 rounded-lg sm:rounded-2xl border overflow-hidden animate-slide-down w-full max-w-full box-border"
      style={{
        background: `linear-gradient(to bottom, ${config.colorHex}08, transparent)`,
        borderColor: config.colorHex,
      }}
      role="tabpanel"
      aria-labelledby={`tab-${platform}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5 sm:mb-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PlatformIcon platform={platform} className="w-4 h-4 sm:w-[18px] sm:h-[18px]" colored />
          <span className="font-semibold text-[12px] sm:text-[15px] text-foreground">
            {config.name}
          </span>
          <span className="text-muted-foreground text-[10px] sm:text-[15px] hidden sm:inline">
            — Seleciona os formatos
          </span>
        </div>
        
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg border-0",
            "bg-card hover:bg-accent",
            "flex items-center justify-center",
            "text-muted-foreground hover:text-foreground",
            "transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          aria-label="Fechar painel de formatos"
        >
          <X className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" />
        </button>
      </div>
      
      {/* Formats Grid - 2 columns on mobile, auto-fill on desktop */}
      <div 
        className="grid grid-cols-2 sm:grid-cols-none gap-1 xs:gap-1.5 sm:gap-3"
        style={{
          gridTemplateColumns: undefined,
        }}
        role="group"
        aria-label="Formatos disponíveis"
      >
        <style>{`
          @media (min-width: 640px) {
            .formats-panel [role="group"] {
              grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important;
            }
          }
        `}</style>
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
