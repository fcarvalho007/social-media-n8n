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
        "relative flex flex-col items-center p-2 sm:p-4",
        "bg-card border rounded-lg",
        "cursor-pointer transition-colors duration-manual-color",
        "hover:border-primary/40 hover:bg-muted/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "min-h-[80px] sm:min-h-[140px] text-center",
        isSelected && "border-primary bg-primary/10 ring-1 ring-primary/20"
      )}
      style={{
        '--platform-color': platformColor,
        '--platform-color-light': `${platformColor}15`,
      } as React.CSSProperties}
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`${format.label}: ${format.description}`}
    >
      {/* Selection indicator */}
      <div className="absolute top-1 right-1 sm:top-2.5 sm:right-2.5">
        {isSelected ? (
          <div 
            className="indicator-checked w-4 h-4 sm:w-[22px] sm:h-[22px] rounded-full flex items-center justify-center text-white"
          >
            <Check size={10} className="sm:w-[14px] sm:h-[14px]" strokeWidth={3} />
          </div>
        ) : (
          <div 
            className="indicator-unchecked w-4 h-4 sm:w-[22px] sm:h-[22px] rounded-full border-2 bg-card transition-colors"
            style={{ borderColor: 'hsl(var(--border))' }}
          />
        )}
      </div>
      
      {/* Illustration - smaller on mobile */}
      <div className="format-illustration mb-1 sm:mb-2.5 scale-[0.6] sm:scale-100 origin-center">
        <FormatIllustration 
          type={getIllustrationType(format.format)} 
          platformColor={platformColor}
          isSelected={isSelected}
        />
      </div>
      
      {/* Format Name */}
      <span className="format-name font-semibold text-[10px] sm:text-[13px] text-foreground mb-0 sm:mb-0.5 leading-tight">
        {format.label}
      </span>
      
      {/* Description - hidden on mobile */}
      <span className="format-description text-[9px] sm:text-[11px] text-muted-foreground leading-tight hidden sm:block">
        {format.description}
      </span>
      
      {/* Badges - simplified on mobile, show only one */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-1 sm:mt-2.5 justify-center">
          {badges.slice(0, 1).map((badge) => (
            <span 
              key={badge}
            className={cn(
                "manual-chip border font-semibold",
                isSelected 
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted border-transparent text-muted-foreground"
              )}
            >
              {badge}
            </span>
          ))}
          {/* Show +N on mobile if more badges */}
          {badges.length > 1 && (
            <span className="text-[7px] sm:hidden text-muted-foreground">+{badges.length - 1}</span>
          )}
          {/* Show rest on desktop */}
          {badges.slice(1, 2).map((badge) => (
            <span 
              key={badge}
              className={cn(
                "manual-chip hidden border font-semibold sm:inline",
                isSelected 
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted border-transparent text-muted-foreground"
              )}
            >
              {badge}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
