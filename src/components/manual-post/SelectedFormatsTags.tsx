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
      <div className="selected-formats pt-4 border-t border-border mt-4">
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-muted-foreground font-medium">Selecionados:</span>
          <span className="text-[13px] text-muted-foreground/60 italic">
            Nenhum formato selecionado
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="selected-formats pt-4 border-t border-border mt-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[13px] text-muted-foreground font-medium">Selecionados:</span>
        
        <div className="flex flex-wrap gap-2">
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
                  "flex items-center gap-1.5",
                  "px-2.5 py-1.5 pr-2",
                  "bg-card border rounded-lg",
                  "text-[13px] font-medium text-foreground",
                  "animate-tag-enter"
                )}
                style={{ borderColor: platformConfig.colorHex }}
              >
                <PlatformIcon 
                  platform={network} 
                  className="w-3.5 h-3.5" 
                  colored 
                />
                <span>{formatConfig.label}</span>
                <button
                  type="button"
                  onClick={() => onRemove(format)}
                  className={cn(
                    "tag-remove w-[18px] h-[18px] rounded",
                    "flex items-center justify-center",
                    "text-muted-foreground",
                    "hover:bg-destructive/10 hover:text-destructive",
                    "transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  )}
                  aria-label={`Remover ${formatConfig.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
