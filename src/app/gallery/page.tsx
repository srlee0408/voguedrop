'use client'

import { Suspense, useEffect, useState } from "react"
import { getGalleryItems, getCategories } from "@/shared/lib/api/gallery"
import { GalleryPageClient } from "./_components/GalleryPageClient"
import { GalleryHeader } from "./_components/GalleryHeader"
import { CategoryFilter } from "./_components/CategoryFilter"
import { GallerySection } from "./_components/GallerySection"
import { GalleryGrid } from "./_components/GalleryGrid"
import { GalleryGridSkeleton } from "./_components/GalleryGridSkeleton"
import { AuthGuard } from "@/app/canvas/_components/AuthGuard"
import type { EffectTemplateWithMedia, Category } from "@/shared/types/database"
import { useSearchParams } from "next/navigation"

/**
 * Gallery 페이지 엔트리 포인트
 * 
 * 주요 역할:
 * 1. 인증된 사용자만 접근 가능하도록 AuthGuard 적용
 * 2. 갤러리 아이템과 카테고리 데이터 로드
 * 3. 카테고리별 필터링 및 표시
 * 
 * 핵심 특징:
 * - AuthGuard로 이중 인증 보안 (middleware + 클라이언트)
 * - 클라이언트 사이드에서 데이터 페칭으로 변경
 * - 카테고리별 동적 필터링 지원
 * 
 * 주의사항:
 * - 서버 컴포넌트에서 클라이언트 컴포넌트로 변경
 * - ISR 기능은 제거되었으나 클라이언트 캐싱으로 성능 유지
 * - AuthGuard는 클라이언트 컴포넌트이므로 'use client' 필요
 */
export default function GalleryPage() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<EffectTemplateWithMedia[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selectedCategory = searchParams.get('category') || null

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        setLoading(true)
        const [itemsData, categoriesData] = await Promise.all([
          getGalleryItems(),
          getCategories()
        ])
        setItems(itemsData)
        setCategories(categoriesData)
      } catch (err) {
        setError('Failed to load gallery data')
        console.error('Gallery data loading error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-black text-white pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <GalleryGridSkeleton />
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-black text-white pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

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
  }, {} as Record<string, { category: typeof categories[0], items: EffectTemplateWithMedia[] }>)

  return (
    <AuthGuard>
      <GalleryPageClient initialItems={items} initialCategories={categories}>
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
    </AuthGuard>
  )
}