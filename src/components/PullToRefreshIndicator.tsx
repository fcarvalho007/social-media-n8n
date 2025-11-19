import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  isPulling: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  isPulling,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const shouldShow = isPulling || isRefreshing;

  if (!shouldShow) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-200 ease-out pointer-events-none"
      style={{
        transform: `translateY(${Math.min(pullDistance * 0.5, 60)}px)`,
        opacity: progress,
      }}
    >
      <div className="bg-card border border-border rounded-full p-3 shadow-lg">
        {isRefreshing ? (
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        ) : (
          <RefreshCw
            className={cn(
              'h-6 w-6 text-primary transition-transform duration-200',
              progress >= 1 && 'rotate-180'
            )}
            style={{
              transform: `rotate(${progress * 180}deg)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
