import { Suspense } from "react"
import { getGalleryItems } from "@/shared/lib/api/gallery"
import { GalleryItems } from "./GalleryItems"

// 컴포넌트 레벨에서는 캐싱 설정 제거 - 부모 페이지 설정을 상속받음

interface GallerySectionProps {
  texts: {
    title: string
    subtitle: string
  }
}

async function GalleryData() {
  try {
    const items = await getGalleryItems()
    // Limit to 8 items for the home page
    const limitedItems = items.slice(0, 8)
    return <GalleryItems items={limitedItems} />
  } catch {
    return (
      <div className="col-span-full text-center py-12">
        <p className="text-red-400 mb-2">Failed to load gallery items</p>
        <p className="text-sm text-gray-400">Please try again later</p>
      </div>
    )
  }
}

function GalleryItemsLoading() {
  return (
    <>
      {[...Array(8)].map((_, index) => (
        <div
          key={index}
          className="relative aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden animate-pulse"
        >
          <div className="w-full h-full bg-gray-800" />
        </div>
      ))}
    </>
  )
}

export async function GallerySection({ texts }: GallerySectionProps) {
  return (
    <section id="gallery" className="py-16 sm:py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {texts.title}
          </h2>
          <p className="text-lg sm:text-xl text-gray-400">
            {texts.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          <Suspense fallback={<GalleryItemsLoading />}>
            <GalleryData />
          </Suspense>
        </div>
      </div>
    </section>
  )
}