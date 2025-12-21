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
      <div className="selected-formats pt-3 sm:pt-4 border-t border-border mt-3 sm:mt-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[12px] sm:text-[13px] text-muted-foreground font-medium">Selecionados:</span>
          <span className="text-[12px] sm:text-[13px] text-muted-foreground/60 italic">
            Nenhum formato selecionado
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="selected-formats pt-3 sm:pt-4 border-t border-border mt-3 sm:mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <span className="text-[12px] sm:text-[13px] text-muted-foreground font-medium flex-shrink-0">Selecionados:</span>
        
        {/* Horizontal scroll on mobile */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide">
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
                  "flex items-center gap-1 sm:gap-1.5 flex-shrink-0",
                  "px-2 py-1 sm:px-2.5 sm:py-1.5 pr-1.5 sm:pr-2",
                  "bg-card border rounded-lg",
                  "text-[11px] sm:text-[13px] font-medium text-foreground",
                  "animate-tag-enter"
                )}
                style={{ borderColor: platformConfig.colorHex }}
              >
                <PlatformIcon 
                  platform={network} 
                  className="w-3 h-3 sm:w-3.5 sm:h-3.5" 
                  colored 
                />
                <span className="whitespace-nowrap">{formatConfig.label}</span>
                <button
                  type="button"
                  onClick={() => onRemove(format)}
                  className={cn(
                    "tag-remove w-4 h-4 sm:w-[18px] sm:h-[18px] rounded",
                    "flex items-center justify-center",
                    "text-muted-foreground",
                    "hover:bg-destructive/10 hover:text-destructive",
                    "transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  )}
                  aria-label={`Remover ${formatConfig.label}`}
                >
                  <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
