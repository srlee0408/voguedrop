# Modal Design System Guide

## 개요
VogueDrop의 모든 모달은 통일된 다크 테마 디자인 시스템을 따릅니다. 이 문서는 AI 에이전트와 개발자가 일관된 모달을 구현할 수 있도록 상세한 가이드를 제공합니다.

## 핵심 원칙
1. **다크 테마 기반**: 모든 모달은 어두운 배경으로 비디오 콘텐츠가 돋보이도록 설계
2. **일관성**: 모든 모달이 동일한 레이아웃, 색상, 간격 사용
3. **반응형**: 모바일부터 데스크톱까지 대응 (MVP는 데스크톱 우선)
4. **접근성**: 명확한 대비와 포커스 상태 제공

## 기본 구조

### 1. 오버레이 (Overlay)
```tsx
<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
```
- **배경**: `bg-black/50` - 반투명 검정 오버레이
- **z-index**: `z-50` - 최상위 레이어
- **정렬**: `flex items-center justify-center` - 중앙 정렬
- **패딩**: `p-4` - 모바일 대응 여백

### 2. 모달 컨테이너
```tsx
<div className="bg-gray-800 w-full max-w-[1200px] max-h-[90vh] rounded-xl p-6 relative">
```
- **배경색**: `bg-gray-800` (#1F2937) - 다크 그레이
- **너비**: `w-full max-w-[1200px]` - 최대 1200px, 반응형
- **높이**: `max-h-[90vh]` - 뷰포트 90% 최대 높이
- **모서리**: `rounded-xl` - 12px 둥근 모서리
- **패딩**: `p-6` - 24px 내부 여백
- **위치**: `relative` - 내부 절대 위치 요소를 위함

### 3. 헤더 섹션
```tsx
<div className="flex justify-between items-center mb-6">
  <h2 className="text-xl font-medium text-white">{title}</h2>
  <button className="text-gray-400 hover:text-gray-300">
    <X className="w-6 h-6" />
  </button>
</div>
```
- **레이아웃**: `flex justify-between items-center` - 양쪽 정렬
- **간격**: `mb-6` - 하단 24px 여백
- **제목 스타일**: 
  - 크기: `text-xl` (20px)
  - 굵기: `font-medium` (500)
  - 색상: `text-white` (#FFFFFF)
- **닫기 버튼**:
  - 기본: `text-gray-400` (#9CA3AF)
  - 호버: `hover:text-gray-300` (#D1D5DB)
  - 아이콘 크기: `w-6 h-6` (24x24px)

## 색상 팔레트

### 주요 색상
```css
/* 배경 */
--modal-bg: #1F2937;          /* bg-gray-800 */
--modal-overlay: rgba(0,0,0,0.5); /* bg-black/50 */

/* 텍스트 */
--text-primary: #FFFFFF;      /* text-white */
--text-secondary: #9CA3AF;    /* text-gray-400 */
--text-tertiary: #6B7280;     /* text-gray-500 */

/* 인터랙티브 요소 */
--hover-light: #D1D5DB;       /* hover:text-gray-300 */
--hover-dark: #374151;        /* hover:bg-gray-700 */

/* 액센트 (VogueDrop 브랜드) */
--accent-primary: #38f47cf9;  /* 민트 그린 */
--accent-warning: #EF4444;    /* text-red-500 */
--accent-success: #10B981;    /* text-green-500 */
```

### 컴포넌트별 색상
```css
/* 카드/아이템 배경 */
--card-bg: #111827;           /* bg-gray-900 */
--card-hover: #1F2937;        /* hover:bg-gray-800 */

/* 버튼 */
--btn-secondary: #374151;     /* bg-gray-700 */
--btn-secondary-hover: #4B5563; /* hover:bg-gray-600 */

/* 보더 */
--border-color: #374151;      /* border-gray-700 */
```

## 컴포넌트 패턴

### 기본 모달 (BaseModal)
```tsx
interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string // 기본값: "bg-gray-800"
}
```

### 복잡한 모달 레이아웃
사이드바가 있는 모달의 경우:
```tsx
<div className="flex flex-1 overflow-hidden">
  {/* 사이드바 */}
  <div className="w-60 border-r border-gray-700 p-6">
    {/* 네비게이션 아이템 */}
  </div>
  
  {/* 메인 콘텐츠 */}
  <div className="flex-1 overflow-y-auto p-6">
    {/* 콘텐츠 그리드 */}
  </div>
</div>
```

### 푸터 섹션 (선택적)
```tsx
<div className="p-6 border-t border-gray-700">
  <div className="flex justify-between items-center">
    <div className="flex gap-2">
      {/* 왼쪽 액션 */}
    </div>
    <div className="flex gap-3">
      <button className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
        Cancel
      </button>
      <button 
        className="px-4 py-2 rounded-lg font-medium"
        style={{ backgroundColor: '#38f47cf9' }}
      >
        Confirm
      </button>
    </div>
  </div>
</div>
```

## 타이포그래피

### 텍스트 크기
- **모달 제목**: `text-xl` (20px)
- **섹션 제목**: `text-lg` (18px)
- **본문**: `text-sm` (14px)
- **캡션/보조**: `text-xs` (12px)

### 폰트 굵기
- **제목**: `font-medium` (500)
- **강조**: `font-semibold` (600)
- **본문**: `font-normal` (400)

## 간격 시스템

### 패딩
- **모달 전체**: `p-6` (24px)
- **섹션 간**: `mb-6` (24px)
- **아이템 간**: `gap-4` (16px)
- **컴팩트**: `p-3` (12px)

### 그리드 레이아웃
```tsx
/* 4열 그리드 (갤러리) */
<div className="grid grid-cols-4 gap-4">

/* 3열 그리드 (중간 크기) */
<div className="grid grid-cols-3 gap-4">

/* 2열 그리드 (큰 아이템) */
<div className="grid grid-cols-2 gap-6">
```

## 인터랙션 상태

### 호버 효과
```css
/* 텍스트 호버 */
.hover\:text-gray-300:hover { color: #D1D5DB; }

/* 배경 호버 */
.hover\:bg-gray-600:hover { background: #4B5563; }

/* 불투명도 호버 */
.hover\:opacity-100:hover { opacity: 1; }
```

### 포커스 상태
```css
/* 링 포커스 */
.focus\:ring-2 { ring-width: 2px; }
.focus\:ring-gray-600 { ring-color: #4B5563; }
```

### 비활성 상태
```css
.disabled\:opacity-50 { opacity: 0.5; }
.disabled\:cursor-not-allowed { cursor: not-allowed; }
```

## 애니메이션

### 기본 트랜지션
```css
.transition-all { 
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-opacity { 
  transition: opacity 150ms ease;
}

.transition-colors { 
  transition: background-color, border-color, color 150ms;
}
```

### 로딩 상태
```tsx
<Loader2 className="w-8 h-8 animate-spin text-gray-400" />
```

## 반응형 디자인

### 브레이크포인트
```css
/* 모바일 */
@media (max-width: 639px) {
  .max-w-[1200px] { max-width: 100%; }
  .grid-cols-4 { grid-template-columns: repeat(2, 1fr); }
}

/* 태블릿 */
@media (max-width: 1023px) {
  .grid-cols-4 { grid-template-columns: repeat(3, 1fr); }
}
```

## 구현 체크리스트

새로운 모달을 만들 때 확인사항:

- [ ] 다크 테마 배경 (`bg-gray-800`) 사용
- [ ] 최대 너비 `max-w-[1200px]` 설정
- [ ] 최대 높이 `max-h-[90vh]` 설정
- [ ] 헤더에 흰색 제목 (`text-white`) 사용
- [ ] 닫기 버튼 호버 효과 (`hover:text-gray-300`) 적용
- [ ] 패딩 `p-6` 적용
- [ ] 둥근 모서리 `rounded-xl` 적용
- [ ] 오버레이 `bg-black/50` 사용
- [ ] z-index `z-50` 설정
- [ ] 반응형 패딩 `p-4` 적용

## 예시 코드

### 간단한 확인 모달
```tsx
export function ConfirmModal({ isOpen, onClose, onConfirm, message }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 w-full max-w-[500px] rounded-xl p-6">
        <h2 className="text-xl font-medium text-white mb-4">Confirm Action</h2>
        <p className="text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-[#38f47cf9] text-black rounded-lg hover:opacity-90"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 갤러리 모달
```tsx
export function GalleryModal({ isOpen, onClose, items }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 w-full max-w-[1200px] max-h-[90vh] rounded-xl flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 pb-2">
          <h2 className="text-xl font-medium text-white">Gallery</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-4 gap-4">
            {items.map(item => (
              <div key={item.id} className="bg-gray-900 rounded-lg aspect-[9/16]">
                {/* 아이템 콘텐츠 */}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## AI 에이전트용 가이드

### 모달 생성 시 필수 규칙
1. **항상 BaseModal 컴포넌트를 기반으로 시작**
2. **다크 테마 색상만 사용** (bg-gray-800, text-white 등)
3. **최대 너비는 1200px를 초과하지 않음**
4. **모든 텍스트는 충분한 대비를 가져야 함**
5. **호버 상태는 반드시 정의**

### 코드 생성 템플릿
```tsx
// 1. Import 필수 요소
import { X } from "lucide-react"

// 2. Props 인터페이스 정의
interface [ModalName]Props {
  isOpen: boolean
  onClose: () => void
  // 추가 props...
}

// 3. 컴포넌트 구현
export function [ModalName]({ isOpen, onClose, ...props }: [ModalName]Props) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 w-full max-w-[1200px] max-h-[90vh] rounded-xl p-6 relative">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-white">[Title]</h2>
          <button className="text-gray-400 hover:text-gray-300" onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* 콘텐츠 */}
        {children}
      </div>
    </div>
  )
}
```

## 자주 발생하는 실수와 해결법

### ❌ 잘못된 예시
```tsx
// 1. 밝은 배경 사용
<div className="bg-white"> // 잘못됨

// 2. 고정 너비
<div className="w-[800px]"> // 잘못됨

// 3. 검은색 텍스트
<h2 className="text-black"> // 잘못됨
```

### ✅ 올바른 예시
```tsx
// 1. 다크 배경 사용
<div className="bg-gray-800"> // 올바름

// 2. 반응형 너비
<div className="w-full max-w-[1200px]"> // 올바름

// 3. 흰색 텍스트
<h2 className="text-white"> // 올바름
```

## 참고 파일
- `/src/shared/components/modals/BaseModal.tsx` - 기본 모달 컴포넌트
- `/src/shared/components/modals/library/LibraryModalBase.tsx` - 복잡한 모달 예시
- `/src/shared/types/library-modal.ts` - 모달 타입 정의

이 가이드를 따라 구현하면 VogueDrop의 일관된 모달 디자인을 유지할 수 있습니다.