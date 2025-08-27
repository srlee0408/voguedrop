/**
 * GalleryGrid - 갤러리 그리드 레이아웃 컴포넌트
 * 
 * 주요 역할:
 * 1. 효과 템플릿들을 반응형 그리드로 표시
 * 2. 화면 크기에 따른 적응형 컬럼 수 조정
 * 3. 빈 상태일 때 적절한 메시지 표시
 * 4. 각 아이템을 GalleryItem 컴포넌트로 렌더링
 * 
 * 핵심 특징:
 * - 반응형 그리드 (2열 → 3열 → 4열로 점진적 확장)
 * - 아이템 간 일정한 간격 유지 (4px → 6px)
 * - 빈 갤러리 상태에 대한 사용자 친화적 메시지
 * - 효과 템플릿의 고유 ID를 key로 사용하여 성능 최적화
 * 
 * 주의사항:
 * - items 배열이 비어있을 때의 UI 처리 중요
 * - 반응형 브레이크포인트는 Tailwind CSS 기준 사용
 * - 각 아이템은 독립적인 GalleryItem으로 관리
 */
import { GalleryItem } from "./GalleryItem"
import type { EffectTemplateWithMedia } from "@/shared/types/database"

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