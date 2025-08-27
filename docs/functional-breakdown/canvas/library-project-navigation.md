# 기능: Canvas 라이브러리 프로젝트 이동 (Library Project Navigation)

## 1. 개요
Canvas 페이지의 라이브러리 모달에서 기존 프로젝트를 선택하여 Video Editor로 이동하는 기능입니다. 사용자가 Canvas에서 생성한 영상을 기반으로 새로운 프로젝트를 만들거나, 기존 프로젝트를 열어 편집할 수 있도록 하는 핵심 워크플로우를 제공합니다.

## 2. 핵심 파일
- **Canvas 모달 관리**: `src/app/canvas/_components/CanvasModals.tsx`
- **라이브러리 모달**: `src/shared/components/modals/LibraryModal.tsx`
- **라이브러리 모달 베이스**: `src/shared/components/modals/library/LibraryModalBase.tsx`
- **라이브러리 카드**: `src/shared/components/modals/library/components/LibraryCard.tsx`
- **UUID 유틸리티**: `src/shared/lib/utils.ts`

## 3. 기능 구조

### 프로젝트 이동 플로우
```
Canvas 페이지 → Library 버튼 클릭 → LibraryModal 열기 
→ 프로젝트 카드 선택 → "Open Project" 버튼 클릭 
→ handleProjectSwitch 실행 → Video Editor 페이지로 이동
```

### 컴포넌트 계층구조
```
CanvasModals
└── LibraryModal (설정 전달)
    └── LibraryModalBase (실제 로직)
        └── LibraryCard (UI 렌더링)
```

## 4. 주요 로직 설명

### 1. 프로젝트 전환 핸들러 (CanvasModals.tsx)
```typescript
import { getShortId } from '@/shared/lib/utils'

// 프로젝트 전환 핸들러 - UUID를 8자리 단축 ID로 변환
const handleProjectSwitch = (projectId: string) => {
  const shortId = getShortId(projectId)  // "77e94f68-..." → "77e94f68"
  router.push(`/video-editor?project=${encodeURIComponent(shortId)}`)
}

<LibraryModal
  isOpen={modals.modals.library}
  onClose={() => modals.closeModal('library')}
  favoriteVideos={favorites.favoriteIds}
  onToggleFavorite={favorites.toggleFavorite}
  onProjectSwitch={handleProjectSwitch}  // 핵심: 이 prop 전달
/>
```

**핵심 포인트**:
- `onProjectSwitch` prop 전달로 프로젝트 이동 기능 활성화
- `getShortId` 함수로 보안을 위한 8자리 단축 ID 변환
- `router.push`로 SPA 방식의 부드러운 페이지 전환

### 2. LibraryModal 설정 (LibraryModal.tsx)
```typescript
const config: LibraryModalConfig = {
  // ... 기타 설정
  openProject: {
    enabled: !!onProjectSwitch,  // onProjectSwitch가 있을 때만 활성화
    onProjectNavigate: onProjectSwitch || (() => {})
  },
  // ...
}
```

**활성화 조건**:
- `onProjectSwitch` prop이 전달되어야 `openProject.enabled = true`
- 이 설정이 false면 프로젝트 이동 버튼이 렌더링되지 않음

### 3. 프로젝트 네비게이션 처리 (LibraryModalBase.tsx)
```typescript
const handleProjectNavigate = useCallback((project: LibraryProject) => {
  // openProject가 활성화되지 않았으면 동작하지 않음
  if (!config.openProject?.enabled) return;
  
  // openProject에 onProjectNavigate가 있으면 project.id를 전달
  if (config.openProject.onProjectNavigate) {
    config.openProject.onProjectNavigate(project.id); // 전체 UUID 전달
    onClose();
  }
}, [pathname, onClose, config.onProjectSwitch, config.openProject]);
```

**처리 과정**:
1. `config.openProject.enabled` 확인 (활성화 여부)
2. 활성화된 경우 `project.id` (전체 UUID)를 콜백으로 전달
3. 모달 닫기

### 4. UI 렌더링 (LibraryCard.tsx)
```typescript
{/* Open project button - only for projects that are NOT current */}
{type === 'project' && onProjectNavigate && !isCurrentProject && (
  <Tooltip text="Open Project" position="top">
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onProjectNavigate(item as LibraryProject);
      }}
      className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
    >
      <ExternalLink className="w-4 h-4" />
    </button>
  </Tooltip>
)}
```

**조건부 렌더링**:
- `type === 'project'`: 프로젝트 타입일 때만
- `onProjectNavigate`: 콜백 함수가 있을 때만
- `!isCurrentProject`: 현재 프로젝트가 아닐 때만

## 5. UUID 시스템 통합

### 단축 ID 변환 (utils.ts)
```typescript
// UUID를 8자리 단축 ID로 변환 (하이픈 제거 후 첫 8자리)
export function getShortId(uuid: string): string {
  return uuid.replace(/-/g, '').substring(0, 8);
}
```

### URL 형식
```
Before: /video-editor?projectId=77e94f68-1234-5678-9abc-def012345678
After:  /video-editor?project=77e94f68
```

**보안 및 UX 개선**:
- 전체 UUID 노출 방지
- 짧고 기억하기 쉬운 URL
- 기존 프로젝트 시스템과 호환

## 6. 문제 해결 과정

### 수정 전 문제점
```typescript
// ❌ Canvas에서 onProjectSwitch 누락
<LibraryModal
  isOpen={modals.modals.library}
  onClose={() => modals.closeModal('library')}
  favoriteVideos={favorites.favoriteIds}
  onToggleFavorite={favorites.toggleFavorite}
  // onProjectSwitch 없음!
/>

// ❌ 결과: openProject.enabled = false
openProject: {
  enabled: !!onProjectSwitch,  // undefined → false
}

// ❌ 결과: 버튼이 렌더링되지 않음
{onProjectNavigate && ( // false이므로 렌더링 안됨
  <button>Open Project</button>
)}
```

### 수정 후 해결
```typescript
// handleProjectSwitch 구현 및 전달
const handleProjectSwitch = (projectId: string) => {
  const shortId = getShortId(projectId)
  router.push(`/video-editor?project=${encodeURIComponent(shortId)}`)
}

<LibraryModal
  onProjectSwitch={handleProjectSwitch}  // 전달
/>

// 결과: openProject.enabled = true
// 결과: 버튼 정상 렌더링 및 동작
```

## 7. 성능 및 보안 고려사항

### API 호출 최적화
- 올바른 8자리 단축 ID 사용으로 중복 API 호출 방지
- ProjectContext에서 현재 프로젝트와 비교하여 불필요한 로드 방지

### 보안 강화
- URL에 전체 UUID 대신 8자리 단축 ID만 노출
- 사용자별 프로젝트 접근 권한 자동 검증

### 사용자 경험
- SPA 방식의 부드러운 페이지 전환
- 로딩 상태 표시로 사용자 피드백 제공
- 현재 프로젝트는 버튼 비활성화로 혼란 방지

## 8. 관련 기능

### Video Editor 연동
- Canvas에서 선택한 프로젝트가 Video Editor에서 정상 로드
- 프로젝트 데이터 복원 및 타임라인 재구성
- 실행 취소/다시 실행 히스토리 초기화

### 즐겨찾기 시스템
- 라이브러리에서 즐겨찾기한 영상들을 우선 표시
- 프로젝트와 클립을 구분하여 관리

## 9. 향후 개선 사항

### 타입 안전성
- `onProjectSwitch` prop을 required로 변경 검토
- 프로젝트 ID 타입 정의 강화

### 에러 처리
- 프로젝트 로드 실패 시 사용자 알림
- 네트워크 오류 시 재시도 로직

### 성능 최적화
- 프로젝트 목록 페이지네이션
- 썸네일 이미지 지연 로딩

이 기능을 통해 Canvas와 Video Editor 간의 원활한 워크플로우가 구현되어, 사용자가 생성한 콘텐츠를 지속적으로 발전시킬 수 있는 환경을 제공합니다.