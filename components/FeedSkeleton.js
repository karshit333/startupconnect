export default function FeedSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 skeleton rounded" />
              <div className="h-3 w-24 skeleton rounded" />
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-4 w-full skeleton rounded" />
            <div className="h-4 w-4/5 skeleton rounded" />
          </div>
          <div className="h-48 w-full skeleton rounded-lg mb-4" />
          <div className="flex justify-between pt-3 border-t border-border">
            <div className="h-8 w-16 skeleton rounded" />
            <div className="h-8 w-16 skeleton rounded" />
            <div className="h-8 w-16 skeleton rounded" />
            <div className="h-8 w-16 skeleton rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 skeleton rounded" />
          <div className="h-3 w-20 skeleton rounded" />
        </div>
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="h-24 skeleton" />
      <div className="px-4 pb-4">
        <div className="w-20 h-20 rounded-full skeleton -mt-10 border-4 border-card" />
        <div className="mt-3 space-y-2">
          <div className="h-5 w-32 skeleton rounded" />
          <div className="h-4 w-24 skeleton rounded" />
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
          <div className="w-10 h-10 rounded-full skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 skeleton rounded" />
            <div className="h-3 w-24 skeleton rounded" />
          </div>
          <div className="h-8 w-20 skeleton rounded" />
        </div>
      ))}
    </div>
  )
}
