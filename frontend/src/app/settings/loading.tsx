import { Skeleton } from '@/components/ui/Skeleton';

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto p-6 lg:p-8 space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-32" />
      <Skeleton className="h-24" />
      <Skeleton className="h-40" />
    </div>
  );
}
