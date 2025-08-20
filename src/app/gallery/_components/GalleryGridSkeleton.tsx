export function GalleryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {[...Array(12)].map((_, index) => (
        <div
          key={index}
          className="relative aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden animate-pulse"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-gray-900" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <div className="h-6 bg-gray-700 rounded mb-2" />
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}