import { GalleryItem } from "./GalleryItem"
import type { Category, EffectTemplateWithMedia } from "@/types/database"
import { ChevronRight } from "lucide-react"
import Link from "next/link"

interface GallerySectionProps {
  category: Category
  items: EffectTemplateWithMedia[]
}

export function GallerySection({ category, items }: GallerySectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold">{category.name}</h2>
        <Link 
          href={`/gallery?category=${category.id}`}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {items.slice(0, 8).map((item) => (
          <GalleryItem key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}