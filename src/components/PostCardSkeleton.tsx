import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const PostCardSkeleton = () => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
      
      <div className="space-y-2 mb-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </CardContent>
  </Card>
);
