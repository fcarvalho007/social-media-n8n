import { PostFormat, getNetworkFromFormat, getFormatConfig } from '@/types/social';
import { PLATFORM_CONFIGS } from './platformConfig';
import { Button } from '@/components/ui/button';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsedFormatsSummaryProps {
  selectedFormats: PostFormat[];
  onExpand: () => void;
  onRemove: (format: PostFormat) => void;
}

export function CollapsedFormatsSummary({ 
  selectedFormats, 
  onExpand, 
  onRemove 
}: CollapsedFormatsSummaryProps) {
  // Group formats by network
  const formatsByNetwork = selectedFormats.reduce((acc, format) => {
    const network = getNetworkFromFormat(format);
    if (!acc[network]) acc[network] = [];
    acc[network].push(format);
    return acc;
  }, {} as Record<string, PostFormat[]>);

  const networks = Object.keys(formatsByNetwork);

  return (
    <div className="space-y-3">
      {/* Compact summary with network icons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {networks.map(network => {
            const config = PLATFORM_CONFIGS[network as keyof typeof PLATFORM_CONFIGS];
            const Icon = config?.icon;
            const formats = formatsByNetwork[network];
            const colorHex = config?.colorHex || '#666';
            
            return (
              <div
                key={network}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: `${colorHex}15`,
                  color: colorHex,
                  border: `1px solid ${colorHex}30`,
                }}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{formats.length}</span>
              </div>
            );
          })}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onExpand}
          className="text-xs h-8 gap-1 text-muted-foreground hover:text-foreground"
        >
          Editar
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Format tags with remove option */}
      <div className="flex flex-wrap gap-1.5">
        {selectedFormats.map(format => {
          const network = getNetworkFromFormat(format);
          const config = PLATFORM_CONFIGS[network as keyof typeof PLATFORM_CONFIGS];
          const formatConfig = getFormatConfig(format);
          const colorHex = config?.colorHex || '#666';
          
          return (
            <div
              key={format}
              className={cn(
                "group flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs",
                "transition-all duration-150"
              )}
              style={{ 
                backgroundColor: `${colorHex}12`,
                color: colorHex,
              }}
            >
              <span className="max-w-[100px] truncate">
                {formatConfig?.label || format}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(format);
                }}
                className="p-0.5 rounded-full opacity-60 hover:opacity-100 hover:bg-black/10 transition-opacity"
                aria-label={`Remover ${formatConfig?.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
