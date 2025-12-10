import { Circle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostFormatConfig } from '@/types/social';
import { FormatIllustration, getIllustrationType } from './FormatIllustration';
import { Badge } from '@/components/ui/badge';

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
        "relative flex flex-col items-center p-4",
        "bg-card border-2 rounded-xl",
        "cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "min-h-[130px] text-center",
        isSelected && "format-card-selected"
      )}
      style={{
        '--platform-color': platformColor,
        '--platform-color-light': `${platformColor}0d`,
        borderColor: isSelected ? platformColor : 'hsl(var(--border))',
        backgroundColor: isSelected ? `${platformColor}08` : undefined,
      } as React.CSSProperties}
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`${format.label}: ${format.description}`}
    >
      {/* Checkbox indicator */}
      <div className="absolute top-2 right-2">
        {isSelected ? (
          <CheckCircle2 
            className="w-5 h-5 format-checkbox-checked"
            style={{ color: platformColor }}
          />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors" />
        )}
      </div>
      
      {/* Illustration */}
      <div className="format-illustration mb-2">
        <FormatIllustration 
          type={getIllustrationType(format.format)} 
          platformColor={platformColor}
        />
      </div>
      
      {/* Format Name */}
      <span className="format-name font-semibold text-[13px] text-foreground mb-0.5">
        {format.label}
      </span>
      
      {/* Description */}
      <span className="format-description text-[11px] text-muted-foreground leading-tight">
        {format.description}
      </span>
      
      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 justify-center">
          {badges.map((badge) => (
            <span 
              key={badge}
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded",
                "bg-muted text-muted-foreground font-medium"
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
