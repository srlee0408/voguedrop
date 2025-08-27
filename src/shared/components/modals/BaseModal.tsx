/**
 * BaseModal - 기본 모달 컴포넌트
 * 
 * 주요 역할:
 * 1. 프로젝트 전반에서 사용되는 모달의 기본 구조 제공
 * 2. 오버레이 배경과 중앙 정렬된 모달 컨테이너
 * 3. 표준화된 헤더(제목, 닫기 버튼) 레이아웃
 * 4. 자식 컴포넌트를 위한 콘텐츠 영역 제공
 * 
 * 핵심 특징:
 * - 반투명 검은 배경 오버레이로 포커스 집중
 * - 최대 너비 1200px, 높이 90vh 제약으로 반응형 지원
 * - ESC 키나 X 버튼을 통한 모달 닫기
 * - 사용자 정의 className으로 스타일 확장 가능
 * 
 * 주의사항:
 * - isOpen이 false일 때 DOM에서 완전 제거
 * - 모달 외부 클릭 시 닫기 기능은 구현되지 않음
 * - z-index 50으로 설정되어 다른 요소들 위에 표시
 */
import { X } from "lucide-react"

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function BaseModal({ isOpen, onClose, title, children, className = "bg-gray-800" }: BaseModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className={`${className} w-full max-w-[1200px] max-h-[90vh] rounded-xl p-6 relative`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-white">{title}</h2>
          <button className="text-gray-400 hover:text-gray-300" onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}