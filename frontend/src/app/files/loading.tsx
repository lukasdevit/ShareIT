import { Skeleton } from '@/components/ui/Skeleton';

export default function FilesLoading() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-zinc-950 px-4 pt-24">
      <div className="w-full max-w-4xl space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}
