import { Skeleton } from '@/components/ui/skeleton'

/**
 * Dashboard-level loading skeleton.
 * Shown while any dashboard page is being fetched/rendered by the server.
 * Matches the max-w-5xl content area from the dashboard layout.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading placeholder */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Card row placeholders */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-5 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
