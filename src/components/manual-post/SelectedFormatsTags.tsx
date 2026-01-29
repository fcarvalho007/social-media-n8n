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
      <div className="selected-formats pt-2.5 sm:pt-4 border-t border-border mt-2.5 sm:mt-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] sm:text-[13px] text-muted-foreground font-medium">Selecionados:</span>
          <span className="text-[11px] sm:text-[13px] text-muted-foreground/60 italic">
            Nenhum formato
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="selected-formats pt-2 sm:pt-4 border-t border-border mt-2 sm:mt-4 w-full max-w-full overflow-hidden">
      <div className="flex items-center gap-1.5 sm:gap-3 overflow-hidden">
        <span className="text-[11px] sm:text-[13px] text-muted-foreground font-medium flex-shrink-0">Selecionados:</span>
        
        {/* Horizontal scroll on mobile */}
        <div className="flex gap-0.5 xs:gap-1 sm:gap-2 overflow-x-auto pb-0.5 sm:flex-wrap scrollbar-hide max-w-[calc(100vw-90px)]">
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
                  "flex items-center gap-1 flex-shrink-0",
                  "px-1.5 py-0.5 sm:px-2.5 sm:py-1.5 pr-1 sm:pr-2",
                  "bg-card border rounded-md sm:rounded-lg",
                  "text-[10px] sm:text-[13px] font-medium text-foreground",
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
