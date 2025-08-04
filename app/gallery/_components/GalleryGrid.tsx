import { GalleryItem } from "./GalleryItem"
import type { EffectTemplateWithMedia } from "@/types/database"

interface GalleryGridProps {
  items: EffectTemplateWithMedia[]
}

export function GalleryGrid({ items }: GalleryGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-400 text-lg">No effects found in this category.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {items.map((item) => (
        <GalleryItem key={item.id} item={item} />
      ))}
    </div>
  )
}