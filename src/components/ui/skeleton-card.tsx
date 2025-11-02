import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCard() {
  return (
    <Card className="p-6 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-2/3" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-1/4" />
      </div>

      <div className="flex items-center gap-4 pt-2 border-t">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
    </Card>
  );
}
