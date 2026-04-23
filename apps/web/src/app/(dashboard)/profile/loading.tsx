import { Skeleton } from '@/components/ui/skeleton'

/** Loading skeleton while the profile page is fetching. */
export default function ProfileLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      <Skeleton className="h-8 w-28" />

      {/* Profile card placeholder */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Change password card placeholder */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-36" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
    </div>
  )
}
