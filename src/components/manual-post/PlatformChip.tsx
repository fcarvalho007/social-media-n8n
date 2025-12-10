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
        "flex items-center gap-2 px-3 py-2",
        "rounded-xl border-2 bg-card",
        "transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
          "w-8 h-8 rounded-lg flex items-center justify-content",
          "transition-all duration-200"
        )}
        style={{ backgroundColor: `${config.colorHex}15` }}
      >
        <PlatformIcon platform={platform} className="w-5 h-5 mx-auto" colored />
      </div>
      
      {/* Platform Name */}
      <span className="font-medium text-sm text-foreground">
        {config.name}
      </span>
      
      {/* Selected Badge */}
      {selectedCount > 0 && (
        <span 
          className="platform-chip-badge px-1.5 py-0.5 rounded-full text-[11px] font-semibold text-white"
          style={{ backgroundColor: config.colorHex }}
        >
          ✓{selectedCount}
        </span>
      )}
      
      {/* Chevron */}
      <ChevronDown 
        className={cn(
          "w-4 h-4 text-muted-foreground ml-auto transition-transform duration-200",
          isExpanded && "rotate-180"
        )} 
      />
    </button>
  );
}
