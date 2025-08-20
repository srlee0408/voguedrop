'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { EffectTemplateWithMedia, Category } from '@/shared/types/database'

/**
 * 갤러리 데이터를 위한 React Query hooks
 * 클라이언트 사이드 캐싱과 상태 관리를 담당합니다.
 */

// API 호출 함수 (클라이언트용)
async function fetchGalleryItems(): Promise<EffectTemplateWithMedia[]> {
  const response = await fetch('/api/gallery/items')
  if (!response.ok) {
    throw new Error('Failed to fetch gallery items')
  }
  return response.json()
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/gallery/categories')
  if (!response.ok) {
    throw new Error('Failed to fetch categories')
  }
  return response.json()
}

/**
 * 갤러리 아이템을 가져오는 Hook
 * @param initialData - SSR에서 전달받은 초기 데이터
 */
export function useGalleryItems(initialData?: EffectTemplateWithMedia[]) {
  return useQuery({
    queryKey: ['gallery', 'items'],
    queryFn: fetchGalleryItems,
    initialData,  // SSR 데이터를 초기값으로 사용
    staleTime: 60 * 1000,  // 60초 동안 fresh
    gcTime: 5 * 60 * 1000,  // 5분 동안 캐시 유지
  })
}

/**
 * 카테고리를 가져오는 Hook
 * @param initialData - SSR에서 전달받은 초기 데이터
 */
export function useCategories(initialData?: Category[]) {
  return useQuery({
    queryKey: ['gallery', 'categories'],
    queryFn: fetchCategories,
    initialData,
    staleTime: 5 * 60 * 1000,  // 카테고리는 5분 동안 fresh
    gcTime: 10 * 60 * 1000,    // 10분 동안 캐시 유지
  })
}

/**
 * 갤러리 데이터 수동 리프레시를 위한 Hook
 */
export function useGalleryRefresh() {
  const queryClient = useQueryClient()
  
  return {
    // 갤러리 아이템만 리프레시
    refreshItems: () => 
      queryClient.invalidateQueries({ queryKey: ['gallery', 'items'] }),
    
    // 카테고리만 리프레시
    refreshCategories: () => 
      queryClient.invalidateQueries({ queryKey: ['gallery', 'categories'] }),
    
    // 모든 갤러리 데이터 리프레시
    refreshAll: () => 
      queryClient.invalidateQueries({ queryKey: ['gallery'] }),
    
    // 특정 데이터 프리페치 (예: 다음 페이지 미리 로드)
    prefetchItems: () => 
      queryClient.prefetchQuery({
        queryKey: ['gallery', 'items'],
        queryFn: fetchGalleryItems,
      }),
  }
}

/**
 * 갤러리 필터링을 위한 Hook
 * 카테고리별 필터링 로직을 캡슐화합니다.
 */
export function useFilteredGallery(
  categoryId: number | null,
  initialItems?: EffectTemplateWithMedia[],
  initialCategories?: Category[]
) {
  const { data: items, isLoading: itemsLoading } = useGalleryItems(initialItems)
  const { data: categories, isLoading: categoriesLoading } = useCategories(initialCategories)
  
  // 필터링된 아이템
  const filteredItems = categoryId 
    ? items?.filter(item => item.category_id === categoryId)
    : items
  
  // 카테고리별 그룹핑
  const itemsByCategory = categories?.reduce((acc, category) => {
    const categoryItems = items?.filter(item => item.category_id === category.id) || []
    if (categoryItems.length > 0) {
      acc[category.id] = { category, items: categoryItems }
    }
    return acc
  }, {} as Record<number, { category: Category, items: EffectTemplateWithMedia[] }>)
  
  return {
    items: filteredItems || [],
    categories: categories || [],
    itemsByCategory: itemsByCategory || {},
    isLoading: itemsLoading || categoriesLoading,
  }
}