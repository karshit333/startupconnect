export default function FeedSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-card rounded-lg border p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 skeleton rounded" />
              <div className="h-3 w-24 skeleton rounded" />
            </div>
          </div>
          
          {/* Content */}
          <div className="space-y-2 mb-4">
            <div className="h-4 w-full skeleton rounded" />
            <div className="h-4 w-4/5 skeleton rounded" />
            <div className="h-4 w-3/5 skeleton rounded" />
          </div>
          
          {/* Image placeholder */}
          <div className="h-52 w-full skeleton rounded-lg mb-4" />
          
          {/* Actions */}
          <div className="flex justify-between pt-3 border-t border-border">
            <div className="h-8 w-20 skeleton rounded" />
            <div className="h-8 w-20 skeleton rounded" />
            <div className="h-8 w-20 skeleton rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Cover */}
      <div className="h-32 skeleton" />
      
      {/* Profile Info */}
      <div className="px-6 pb-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-28 h-28 rounded-full skeleton -mt-14 border-4 border-background" />
          <div className="flex-1 sm:mt-4 space-y-3 w-full">
            <div className="h-7 w-48 skeleton rounded" />
            <div className="h-4 w-32 skeleton rounded" />
            <div className="h-4 w-full skeleton rounded" />
            <div className="h-4 w-3/4 skeleton rounded" />
          </div>
        </div>
        
        {/* Skills */}
        <div className="flex gap-2 mt-4">
          <div className="h-6 w-16 skeleton rounded-full" />
          <div className="h-6 w-20 skeleton rounded-full" />
          <div className="h-6 w-14 skeleton rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 skeleton rounded" />
          <div className="h-4 w-24 skeleton rounded" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-4 w-full skeleton rounded" />
        <div className="h-4 w-4/5 skeleton rounded" />
      </div>
    </div>
  )
}

export function MessageSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 border-b border-border">
          <div className="w-12 h-12 rounded-full skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 skeleton rounded" />
            <div className="h-3 w-48 skeleton rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EventSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-card rounded-lg border overflow-hidden">
          <div className="flex">
            <div className="w-24 p-4 border-r border-border flex flex-col items-center justify-center">
              <div className="h-8 w-12 skeleton rounded mb-1" />
              <div className="h-4 w-10 skeleton rounded" />
            </div>
            <div className="flex-1 p-4 space-y-3">
              <div className="h-5 w-20 skeleton rounded-full" />
              <div className="h-5 w-48 skeleton rounded" />
              <div className="h-4 w-full skeleton rounded" />
              <div className="flex gap-4">
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-4 w-20 skeleton rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border border-border rounded-lg">
          <div className="w-10 h-10 rounded-full skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 skeleton rounded" />
            <div className="h-3 w-28 skeleton rounded" />
          </div>
          <div className="h-8 w-20 skeleton rounded" />
        </div>
      ))}
    </div>
  )
}
