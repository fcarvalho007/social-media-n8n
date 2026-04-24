import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostFormat, NETWORK_POST_FORMATS, getNetworkFromFormat } from '@/types/social';
import { getPlatformConfig, PlatformIcon } from './platformConfig';

interface SelectedFormatsTagsProps {
  selectedFormats: PostFormat[];
  onRemove: (format: PostFormat) => void;
}

export function SelectedFormatsTags({ selectedFormats, onRemove }: SelectedFormatsTagsProps) {
  if (selectedFormats.length === 0) {
    return (
      <div className="selected-formats border-t border-border/40 pt-3">
        <div className="flex items-center gap-2">
          <span className="manual-field-label text-muted-foreground">Selecionados:</span>
          <span className="manual-microcopy italic text-muted-foreground/60">
            Nenhum formato
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="selected-formats w-full max-w-full overflow-hidden border-t border-border/40 pt-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span className="manual-field-label flex-shrink-0 text-muted-foreground">Selecionados:</span>
        
        {/* Grid wrap on mobile */}
        <div className="flex flex-wrap gap-1.5 xs:gap-2 sm:gap-2">
          {selectedFormats.map((format) => {
            const network = getNetworkFromFormat(format);
            const platformConfig = getPlatformConfig(network);
            const formatConfig = NETWORK_POST_FORMATS[network]?.find(f => f.format === format);
            
            if (!formatConfig) return null;
            
            return (
              <div
                key={format}
                className={cn(
                  "selected-tag group",
                  "manual-touch-chip flex-shrink-0 gap-1.5 pr-1 sm:pr-2",
                  "bg-card border",
                  "font-medium text-foreground",
                  "animate-tag-enter"
                )}
                style={{ borderColor: platformConfig.colorHex }}
              >
                <PlatformIcon 
                  platform={network} 
                  className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" 
                  colored 
                />
                <span className="whitespace-nowrap">{formatConfig.label}</span>
                <button
                  type="button"
                  onClick={() => onRemove(format)}
                  className={cn(
                    "tag-remove w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] rounded",
                    "manual-touch-target sm:min-h-0 sm:min-w-0",
                    "flex items-center justify-center",
                    "text-muted-foreground",
                    "hover:bg-destructive/10 hover:text-destructive",
                    "transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  )}
                  aria-label={`Remover ${formatConfig.label}`}
                >
                  <X className="w-2 h-2 sm:w-3 sm:h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
