export default function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full skeleton-shimmer" />
            <div className="flex-1">
              <div className="h-4 w-32 skeleton-shimmer rounded mb-2" />
              <div className="h-3 w-24 skeleton-shimmer rounded" />
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-4 w-full skeleton-shimmer rounded" />
            <div className="h-4 w-3/4 skeleton-shimmer rounded" />
          </div>
          <div className="h-48 w-full skeleton-shimmer rounded-lg mb-4" />
          <div className="flex justify-between pt-3 border-t">
            <div className="h-8 w-20 skeleton-shimmer rounded" />
            <div className="h-8 w-20 skeleton-shimmer rounded" />
            <div className="h-8 w-20 skeleton-shimmer rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
