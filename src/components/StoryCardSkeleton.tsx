import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const StoryCardSkeleton = () => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      
      <Skeleton className="h-48 w-full rounded-lg mb-3" />
      
      <div className="space-y-2 mb-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </CardContent>
  </Card>
);
