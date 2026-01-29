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
        "platform-chip group relative",
        "flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2",
        "w-[52px] xs:w-[60px] sm:w-auto sm:min-w-[110px]",
        "px-1 py-1 xs:px-1.5 xs:py-1.5 sm:px-3 sm:py-2",
        "min-h-[48px] xs:min-h-[52px] sm:min-h-[44px]",
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
      {/* Selected Badge - Positioned absolutely */}
      {selectedCount > 0 && (
        <span 
          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center shadow-sm"
          style={{ backgroundColor: config.colorHex }}
        >
          {selectedCount}
        </span>
      )}
      
      {/* Icon */}
      <div 
        className={cn(
          "w-4 h-4 xs:w-5 xs:h-5 sm:w-7 sm:h-7 rounded-md flex items-center justify-center",
          "transition-all duration-200"
        )}
        style={{ backgroundColor: `${config.colorHex}15` }}
      >
        <PlatformIcon platform={platform} className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4" colored />
      </div>
      
      {/* Platform Name */}
      <span className={cn(
        "font-medium text-[9px] xs:text-[10px] sm:text-xs text-foreground leading-tight text-center sm:text-left truncate max-w-full"
      )}>
        <span className="sm:hidden">{config.shortName || config.name.slice(0, 3)}</span>
        <span className="hidden sm:inline">{config.name}</span>
      </span>
      
      {/* Chevron - Desktop only */}
      <ChevronDown 
        className={cn(
          "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
          "hidden sm:block",
          isExpanded && "rotate-180"
        )} 
      />
    </button>
  );
}
