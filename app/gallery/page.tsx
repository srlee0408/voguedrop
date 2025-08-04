import { Suspense } from "react"
import { getGalleryItems, getCategories } from "@/lib/api/gallery"
import { GalleryPageClient } from "./_components/GalleryPageClient"
import { GalleryHeader } from "./_components/GalleryHeader"
import { CategoryFilter } from "./_components/CategoryFilter"
import { GallerySection } from "./_components/GallerySection"
import { GalleryGrid } from "./_components/GalleryGrid"
import { GalleryGridSkeleton } from "./_components/GalleryGridSkeleton"
import type { EffectTemplateWithMedia } from "@/types/database"

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  searchParams: Promise<{ category?: string }>
}

export default async function GalleryPage({ searchParams }: PageProps) {
  const params = await searchParams
  
  const [items, categories] = await Promise.all([
    getGalleryItems(),
    getCategories()
  ])

  const selectedCategory = params.category ? parseInt(params.category) : null

  // Group items by category
  const itemsByCategory = categories.reduce((acc, category) => {
    const categoryItems = items.filter(item => item.category_id === category.id)
    if (categoryItems.length > 0) {
      acc[category.id] = {
        category,
        items: categoryItems
      }
    }
    return acc
  }, {} as Record<number, { category: typeof categories[0], items: EffectTemplateWithMedia[] }>)

  return (
    <GalleryPageClient>
      <div className="min-h-screen bg-black text-white pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <GalleryHeader />
        
        <CategoryFilter 
          categories={categories} 
          selectedCategory={selectedCategory} 
        />
        
        {selectedCategory === null ? (
          // Show all categories with sections
          <div className="space-y-16">
            {Object.values(itemsByCategory).map(({ category, items }) => (
              <GallerySection 
                key={category.id} 
                category={category} 
                items={items} 
              />
            ))}
          </div>
        ) : (
          // Show only selected category
          <Suspense fallback={<GalleryGridSkeleton />}>
            <GalleryGrid 
              items={items.filter(item => item.category_id === selectedCategory)} 
            />
          </Suspense>
        )}
        </div>
      </div>
    </GalleryPageClient>
  )
}