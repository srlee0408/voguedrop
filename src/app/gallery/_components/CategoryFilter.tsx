/**
 * CategoryFilter - 갤러리 카테고리 필터 컴포넌트
 * 
 * 주요 역할:
 * 1. 효과 카테고리별 필터링 버튼 제공
 * 2. 현재 선택된 카테고리 시각적 하이라이트
 * 3. URL 라우팅을 통한 카테고리 상태 관리
 * 4. "All" 옵션으로 전체 효과 보기 기능
 * 
 * 핵심 특징:
 * - 클라이언트 사이드 라우팅으로 즉시 필터링
 * - 선택된 카테고리는 다른 스타일로 구분 표시
 * - 반응형 버튼 레이아웃 (플렉스 래핑)
 * - URL 쿼리 파라미터로 카테고리 상태 유지
 * 
 * 주의사항:
 * - selectedCategory가 null이면 "All" 상태
 * - 라우터 push로 페이지 리로드 없이 필터링
 * - 카테고리 ID는 URL 쿼리 파라미터로 관리
 */
"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/shared/lib/utils/generation-progress"
import type { Category } from "@/shared/types/database"

interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: string | null
}

export function CategoryFilter({ categories, selectedCategory }: CategoryFilterProps) {
  const router = useRouter()

  const handleCategoryClick = (categoryId: string | null) => {
    if (categoryId === null) {
      router.push('/gallery')
    } else {
      router.push(`/gallery?category=${categoryId}`)
    }
  }

  return (
    <div className="flex flex-wrap gap-3 mb-12 justify-center">
      {/* All category */}
      <button
        onClick={() => handleCategoryClick(null)}
        className={cn(
          "px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-200",
          selectedCategory === null
            ? "bg-white text-black hover:bg-gray-100"
            : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
        )}
      >
        All
      </button>

      {/* Dynamic categories from DB */}
      {categories.map((category) => {
        return (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className={cn(
              "px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-200",
              selectedCategory === category.id
                ? "bg-white text-black hover:bg-gray-100"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
            )}
          >
            {category.name}
          </button>
        )
      })}
    </div>
  )
}