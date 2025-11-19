import { ReactNode, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Trash2, X } from 'lucide-react';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon?: ReactNode;
    color?: string;
    label?: string;
  };
  rightAction?: {
    icon?: ReactNode;
    color?: string;
    label?: string;
  };
  className?: string;
  threshold?: number;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction = {
    icon: <Trash2 className="h-5 w-5" />,
    color: 'bg-destructive',
    label: 'Excluir',
  },
  rightAction = {
    icon: <Check className="h-5 w-5" />,
    color: 'bg-success',
    label: 'Aprovar',
  },
  className,
  threshold = 100,
}: SwipeableCardProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    setOffset(diff);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    if (Math.abs(offset) >= threshold) {
      if (offset > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (offset < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    setOffset(0);
  };

  const leftVisible = offset > 0;
  const rightVisible = offset < 0;
  const progress = Math.min(Math.abs(offset) / threshold, 1);

  return (
    <div className="relative overflow-hidden touch-pan-y">
      {/* Left Action */}
      {onSwipeRight && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 flex items-center justify-end pr-4 transition-all duration-200',
            leftAction.color,
            leftVisible ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            width: Math.max(0, offset),
          }}
        >
          <div
            className="flex flex-col items-center gap-1 text-white"
            style={{
              opacity: progress,
              transform: `scale(${0.8 + progress * 0.2})`,
            }}
          >
            {rightAction.icon}
            {rightAction.label && (
              <span className="text-xs font-medium">{rightAction.label}</span>
            )}
          </div>
        </div>
      )}

      {/* Right Action */}
      {onSwipeLeft && (
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 flex items-center justify-start pl-4 transition-all duration-200',
            rightAction.color,
            rightVisible ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            width: Math.max(0, -offset),
          }}
        >
          <div
            className="flex flex-col items-center gap-1 text-white"
            style={{
              opacity: progress,
              transform: `scale(${0.8 + progress * 0.2})`,
            }}
          >
            {leftAction.icon}
            {leftAction.label && (
              <span className="text-xs font-medium">{leftAction.label}</span>
            )}
          </div>
        </div>
      )}

      {/* Card Content */}
      <div
        className={cn(
          'relative bg-card transition-transform duration-200 ease-out',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
          className
        )}
        style={{
          transform: `translateX(${offset}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
