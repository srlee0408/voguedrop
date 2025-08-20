"use client"

import { HomeHeader } from "@/app/(home)/_components/HomeHeader"
import { useGalleryItems, useCategories, useGalleryRefresh } from '@/lib/hooks/useGalleryData'
import type { EffectTemplateWithMedia, Category } from '@/types/database'
import React from 'react'

interface GalleryPageClientProps {
  children: React.ReactNode
  initialItems?: EffectTemplateWithMedia[]
  initialCategories?: Category[]
}

export function GalleryPageClient({ 
  children,
  initialItems,
  initialCategories 
}: GalleryPageClientProps) {
  // SSR 데이터를 초기값으로 사용하여 React Query hooks 호출
  const { data: items, isLoading: itemsLoading } = useGalleryItems(initialItems)
  const { data: categories, isLoading: categoriesLoading } = useCategories(initialCategories)
  const { refreshAll } = useGalleryRefresh()

  // 백그라운드 리프레시 중 표시할 로딩 인디케이터
  const isRefreshing = itemsLoading || categoriesLoading

  return (
    <>
      <HomeHeader />
      {/* 리프레시 중 상태 표시 */}
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse z-50" />
      )}
      
      {/* Children에 데이터 전달 */}
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{
              items?: EffectTemplateWithMedia[]
              categories?: Category[]
            }>, { 
              items: items || initialItems || [],
              categories: categories || initialCategories || []
            })
          : child
      )}
      
      {/* 수동 리프레시 버튼 (선택적) */}
      <button
        onClick={() => refreshAll()}
        className="fixed bottom-6 right-6 bg-white/10 backdrop-blur-md p-3 rounded-full hover:bg-white/20 transition-colors duration-200 group"
        aria-label="Refresh gallery"
      >
        <svg 
          className="w-5 h-5 text-white group-hover:rotate-180 transition-transform duration-500" 
          fill="none" 
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
      </button>
    </>
  )
}