import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostFormatConfig } from '@/types/social';
import { FormatIllustration, getIllustrationType } from './FormatIllustration';

interface FormatCardProps {
  format: PostFormatConfig;
  isSelected: boolean;
  onToggle: () => void;
  platformColor: string;
}

export function FormatCard({ format, isSelected, onToggle, platformColor }: FormatCardProps) {
  // Build badges
  const badges: string[] = [];
  if (format.requiresVideo) badges.push('Vídeo');
  if (format.format.includes('stories')) badges.push('24h');
  if (format.format.includes('reel') || format.format.includes('shorts') || format.format.includes('tiktok')) badges.push('9:16');
  if (format.maxDuration && format.maxDuration <= 60) badges.push(`≤${format.maxDuration}s`);
  if (format.format === 'instagram_carousel') badges.push('Popular');
  if (format.format === 'linkedin_document') badges.push('PDF');
  
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "format-card group",
        "relative flex flex-col items-center p-2.5 sm:p-4",
        "bg-card border-2 rounded-lg sm:rounded-xl",
        "cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "min-h-[100px] sm:min-h-[140px] text-center",
        isSelected && "format-card-selected"
      )}
      style={{
        '--platform-color': platformColor,
        '--platform-color-light': `${platformColor}15`,
        borderColor: isSelected ? platformColor : 'hsl(var(--border))',
        borderWidth: isSelected ? '3px' : '2px',
        backgroundColor: isSelected ? `${platformColor}08` : undefined,
        boxShadow: isSelected 
          ? `0 0 0 4px ${platformColor}15, 0 4px 12px rgba(0,0,0,0.1)` 
          : undefined,
      } as React.CSSProperties}
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`${format.label}: ${format.description}`}
    >
      {/* Selection indicator */}
      <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5">
        {isSelected ? (
          <div 
            className="indicator-checked w-5 h-5 sm:w-[22px] sm:h-[22px] rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: platformColor }}
          >
            <Check size={12} className="sm:w-[14px] sm:h-[14px]" strokeWidth={3} />
          </div>
        ) : (
          <div 
            className="indicator-unchecked w-5 h-5 sm:w-[22px] sm:h-[22px] rounded-full border-2 bg-card transition-colors"
            style={{ borderColor: 'hsl(var(--border))' }}
          />
        )}
      </div>
      
      {/* Illustration - smaller on mobile */}
      <div className="format-illustration mb-1.5 sm:mb-2.5 scale-75 sm:scale-100 origin-center">
        <FormatIllustration 
          type={getIllustrationType(format.format)} 
          platformColor={platformColor}
          isSelected={isSelected}
        />
      </div>
      
      {/* Format Name */}
      <span className="format-name font-semibold text-[11px] sm:text-[13px] text-foreground mb-0.5 leading-tight">
        {format.label}
      </span>
      
      {/* Description - hidden on very small screens */}
      <span className="format-description text-[9px] sm:text-[11px] text-muted-foreground leading-tight hidden xs:block">
        {format.description}
      </span>
      
      {/* Badges - simplified on mobile */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-1.5 sm:mt-2.5 justify-center">
          {badges.slice(0, 2).map((badge) => (
            <span 
              key={badge}
              className={cn(
                "text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md font-semibold border",
                isSelected 
                  ? "bg-card border-current"
                  : "bg-muted border-transparent text-muted-foreground"
              )}
              style={isSelected ? { 
                color: platformColor,
                borderColor: `${platformColor}30`,
              } : undefined}
            >
              {badge}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
