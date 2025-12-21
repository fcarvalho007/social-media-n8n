import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SocialNetwork } from '@/types/social';
import { getPlatformConfig, PlatformIcon } from './platformConfig';

interface PlatformChipProps {
  platform: SocialNetwork;
  selectedCount: number;
  isExpanded: boolean;
  onClick: () => void;
}

export function PlatformChip({ platform, selectedCount, isExpanded, onClick }: PlatformChipProps) {
  const config = getPlatformConfig(platform);
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "platform-chip group",
        "flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2",
        "rounded-lg sm:rounded-xl border-2 bg-card",
        "transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "flex-shrink-0",
        isExpanded && "platform-chip-expanded",
        selectedCount > 0 && "platform-chip-selected"
      )}
      style={{
        '--platform-color': config.colorHex,
        '--platform-color-light': `${config.colorHex}0d`,
      } as React.CSSProperties}
      aria-expanded={isExpanded}
      aria-label={`${config.name} - ${selectedCount} formatos selecionados`}
    >
      {/* Icon Container */}
      <div 
        className={cn(
          "w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center",
          "transition-all duration-200"
        )}
        style={{ backgroundColor: `${config.colorHex}15` }}
      >
        <PlatformIcon platform={platform} className="w-3.5 h-3.5 sm:w-5 sm:h-5" colored />
      </div>
      
      {/* Platform Name - abbreviated on mobile */}
      <span className={cn(
        "font-medium text-[11px] sm:text-sm text-foreground",
        !isExpanded && selectedCount === 0 && "hidden sm:inline"
      )}>
        {config.name}
      </span>
      
      {/* Selected Badge */}
      {selectedCount > 0 && (
        <span 
          className="platform-chip-badge px-1 py-0.5 sm:px-1.5 rounded-full text-[9px] sm:text-[11px] font-semibold text-white"
          style={{ backgroundColor: config.colorHex }}
        >
          ✓{selectedCount}
        </span>
      )}
      
      {/* Chevron */}
      <ChevronDown 
        className={cn(
          "w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground transition-transform duration-200",
          isExpanded && "rotate-180"
        )} 
      />
    </button>
  );
}
