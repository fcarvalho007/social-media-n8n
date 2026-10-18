import { Skeleton } from '@/components/ui/skeleton';

export function PageLoading({ label = 'A carregar a página…' }: { label?: string }) {
  return <div role="status" aria-live="polite" className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
    <p className="text-sm text-muted-foreground">{label}</p>
    <div aria-hidden="true" className="flex flex-col gap-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
  </div>;
}
