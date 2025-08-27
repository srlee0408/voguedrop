# Task: SlotManager Context 마이그레이션

## 1. 문제 정의

### 현재 상황
- `useSlotManager()` 훅이 여러 컴포넌트에서 독립적으로 호출됨
- 각 호출마다 별도의 상태 인스턴스 생성
- ImageBrush Apply 시 슬롯 업데이트가 Canvas에 반영되지 않음

### 문제 발생 원인
```
CanvasContext.tsx: useSlotManager() → 인스턴스 A
CanvasLayout.tsx:  useSlotManager() → 인스턴스 B (Canvas에 전달)
CanvasModals.tsx:  useSlotManager() → 인스턴스 C (ImageBrush에서 업데이트)
```

### 영향 범위
- ImageBrush 기능 (이미지 편집 후 슬롯 미반영)
- 향후 슬롯 관련 기능 추가 시 동일한 문제 발생 가능

## 2. 해결 방안

### 핵심 전략
- SlotManager를 Context 레벨에서 단일 인스턴스로 관리
- 모든 컴포넌트가 동일한 상태 공유
- 기존 기능 100% 호환성 유지

## 3. 영향도 분석

### 영향받는 기능들
1. **이미지 업로드/제거** 영향 없음
   - handleImageUpload, handleImageRemove 그대로 동작

2. **비디오 생성** 영향 없음
   - findAvailableSlotForGeneration
   - setSlotToImage, markSlotGenerating
   - placeVideoInSlot, resetSlot

3. **슬롯 선택/관리** 영향 없음
   - handleSlotSelect
   - selectedSlotIndex 추적

4. **히스토리 비디오 토글** 영향 없음
   - handleVideoToggle

5. **즐겨찾기** 영향 없음
   - updateVideoFavoriteFlag

6. **ImageBrush** 개선됨
   - 이제 정상적으로 슬롯 업데이트

### 영향받는 파일
- `app/canvas/_context/CanvasContext.tsx`
- `app/canvas/_types/index.ts`
- `app/canvas/_components/CanvasLayout.tsx`
- `app/canvas/_components/CanvasModals.tsx`

### 영향받지 않는 파일
- `app/canvas/_hooks/useSlotManager.ts` (로직 변경 없음)
- `app/canvas/_hooks/useVideoGeneration.ts` (인터페이스 동일)
- `app/canvas/_components/Canvas.tsx` (props 동일)
- 기타 모든 컴포넌트

## 4. 구현 계획

### Phase 1: Context 수정
```typescript
// CanvasContext.tsx
export function CanvasProvider({ children }: CanvasProviderProps) {
  // 기존 코드...
  const slotManager = useSlotManager() // 단일 인스턴스
  
  // videoGeneration에 slotManager 전달
  const videoGeneration = useVideoGeneration({
    // ... 기존 props
    slotManager: {
      slotStates: slotManager.slotStates,
      findAvailableSlotForGeneration: slotManager.findAvailableSlotForGeneration,
      setSlotToImage: slotManager.setSlotToImage,
      markSlotGenerating: slotManager.markSlotGenerating,
      placeVideoInSlot: slotManager.placeVideoInSlot,
      resetSlot: slotManager.resetSlot,
    },
    // ...
  })
  
  const contextValue: CanvasContextValue = {
    // ... 기존 값들
    slotManager, // 추가
  }
}
```

### Phase 2: 타입 정의
```typescript
// types/index.ts
export interface CanvasContextValue {
  // ... 기존 타입
  slotManager: SlotManagerReturn
}

export interface SlotManagerReturn {
  // 상태
  slotContents: Array<SlotContent>
  slotStates: Array<'empty' | 'generating' | 'completed'>
  selectedSlotIndex: number | null
  activeVideo: GeneratedVideo | null
  
  // 메서드
  handleVideoToggle: (video: GeneratedVideo, isGenerating: (slot: number) => boolean) => boolean
  handleRemoveContent: (index: number) => void
  handleImageUpload: (imageUrl: string, isGenerating: (slot: number) => boolean, prevImage?: string | null) => void
  handleSlotSelect: (index: number, video: GeneratedVideo | null) => void
  removeImageByUrlIfEmpty: (imageUrl: string) => void
  updateVideoFavoriteFlag: (videoId: string, isFavorite: boolean) => void
  
  // 생성 플로우 인터페이스
  findAvailableSlotForGeneration: (imageUrl: string | null) => number
  setSlotToImage: (slotIndex: number, imageUrl: string) => void
  markSlotGenerating: (slotIndex: number) => void
  placeVideoInSlot: (slotIndex: number, video: GeneratedVideo) => void
  markSlotCompleted: (slotIndex: number) => void
  resetSlot: (slotIndex: number) => void
}
```

### Phase 3: 컴포넌트 수정
```typescript
// CanvasLayout.tsx
export function CanvasLayout() {
  const {
    // ... 기존 값들
    slotManager, // Context에서 가져옴
  } = useCanvas()
  
  // const slotManager = useSlotManager() 제거
  
  // videoGeneration도 Context의 것 사용하거나
  // 필요시 Context에서 가져온 slotManager 전달
}

// CanvasModals.tsx
export function CanvasModals() {
  const {
    // ... 기존 값들
    slotManager, // Context에서 가져옴
  } = useCanvas()
  
  // const slotManager = useSlotManager() 제거
}
```

## 5. 테스트 계획

### 단위 테스트
1. slotManager 메서드 동작 확인
2. 상태 업데이트 정확성 검증

### 통합 테스트
1. 이미지 업로드 → 슬롯 표시
2. 비디오 생성 → 슬롯 업데이트
3. ImageBrush Apply → 슬롯 실시간 반영
4. 히스토리 비디오 토글
5. 즐겨찾기 기능
6. 슬롯 선택/제거

### 회귀 테스트
- 모든 기존 기능이 정상 동작하는지 확인
- 성능 저하가 없는지 확인

## 6. 리스크 및 대응 방안

### 리스크 1: 불필요한 리렌더링
- **대응**: React.memo, useCallback 적절히 활용
- **모니터링**: React DevTools Profiler로 성능 측정

### 리스크 2: Context 복잡도 증가
- **대응**: slotManager 관련 로직만 포함, 다른 도메인과 분리
- **장기 계획**: 필요시 별도 SlotContext 분리 고려

### 리스크 3: 타입 안정성
- **대응**: 엄격한 타입 정의, 빌드 시 타입 체크
- **검증**: TypeScript strict mode 활용

## 7. 롤백 계획

변경사항이 문제를 일으킬 경우:
1. Git revert로 즉시 롤백
2. 각 컴포넌트에서 독립적인 useSlotManager() 호출로 복원
3. 문제 분석 후 재시도

## 8. 예상 결과

### 즉각적 효과
- ImageBrush Apply 시 슬롯 실시간 업데이트 ✅
- 모든 슬롯 관련 상태 동기화 ✅

### 장기적 효과
- 코드 유지보수성 향상
- 새로운 슬롯 기능 추가 시 일관된 상태 관리
- 디버깅 용이성 증가

## 9. 구현 체크리스트

- [ ] CanvasContext에 slotManager 인스턴스 생성
- [ ] CanvasContextValue 타입에 slotManager 추가
- [ ] SlotManagerReturn 인터페이스 정의
- [ ] CanvasLayout의 독립적인 useSlotManager 제거
- [ ] CanvasModals의 독립적인 useSlotManager 제거
- [ ] videoGeneration 훅 연결 확인
- [ ] 린트 에러 해결
- [ ] 빌드 성공 확인
- [ ] 모든 기능 테스트
- [ ] ImageBrush 슬롯 업데이트 확인

## 10. 성공 기준

1. **기능적 성공**
   - ImageBrush Apply → 슬롯 즉시 업데이트
   - 모든 기존 기능 정상 동작

2. **기술적 성공**
   - 단일 slotManager 인스턴스
   - 타입 안정성 확보
   - 린트/빌드 에러 없음

3. **유지보수성**
   - 명확한 인터페이스
   - 문서화 완료
   - 테스트 가능한 구조

---

작성일: 2024-12-20
작성자: Claude
버전: 1.0.0