# 기능: 슬롯 관리 (Slot Management)

## 1. 개요
Canvas 페이지의 4분할 슬롯 시스템은 사용자가 업로드한 이미지와 생성된 비디오를 관리하는 핵심 UI입니다. `SlotContext`는 이 슬롯들의 상태와 콘텐츠를 관리하는 단일 책임(Single Responsibility)을 가집니다.

## 2. 핵심 파일
- **상태 및 로직**: `src/app/canvas/_context/SlotContext.tsx`
- **타입 정의**: `src/app/canvas/_types/index.ts` (e.g., `SlotContent`, `SlotState`)
- **슬롯 관리 훅**: `src/app/canvas/_hooks/useSlotManager.ts` (실질적인 로직 포함)

## 3. 상태 구조
`useSlotManager` 훅은 다음의 핵심 상태를 관리합니다.

```typescript
interface SlotManager {
  slotContents: Array<SlotContent | null>; // 각 슬롯의 이미지/비디오 데이터
  slotStates: Array<'empty' | 'generating' | 'completed'>; // 각 슬롯의 상태
  selectedSlotIndex: number | null; // 현재 선택된 슬롯 인덱스
  activeVideo: GeneratedVideo | null; // 현재 미리보기 중인 비디오
}

interface SlotContent {
  type: 'image' | 'video';
  url: string;
  data?: GeneratedVideo; // 비디오인 경우 상세 데이터
}
```

## 4. 주요 로직 설명

### 이미지 업로드 (`handleImageUpload`)
1.  `isSlotGenerating` 함수로 현재 생성 중인 슬롯이 있는지 확인합니다.
2.  `slotContents` 배열에서 비어있는(`null`) 슬롯을 찾습니다.
3.  만약 모든 슬롯이 차 있다면, 가장 오래된 `completed` 상태의 슬롯을 찾아 교체합니다.
4.  선택된 슬롯에 이미지 정보를 업데이트하고, 상태를 `'empty'`로 유지합니다. (생성 전이므로)

### 비디오 생성 플로우 연동
`GenerationContext`는 슬롯 관리를 위해 `SlotContext`의 특정 함수들을 사용합니다.

1.  **`findAvailableSlotForGeneration`**: 생성 시작 시, 업로드된 이미지가 있는 슬롯 또는 첫 번째 빈 슬롯을 찾아 인덱스를 반환합니다.
2.  **`markSlotGenerating`**: 해당 슬롯의 상태를 `'generating'`으로 변경하고, UI에 로딩 스피너를 표시하게 합니다.
3.  **`placeVideoInSlot`**: 생성 완료 시, 웹훅을 통해 받은 비디오 정보를 해당 슬롯에 배치하고 상태를 `'completed'`로 변경합니다.
4.  **`resetSlot`**: 생성 실패 또는 사용자 요청 시 슬롯을 초기 상태(`'empty'`)로 되돌립니다.

### 히스토리 비디오 토글 (`handleVideoToggle`)
- 라이브러리에서 과거에 생성한 비디오를 클릭했을 때 호출됩니다.
- 이미 슬롯에 해당 비디오가 있으면 제거하고, 없으면 빈 슬롯을 찾아 추가합니다.
- 이를 통해 사용자는 과거 생성물을 현재 작업과 비교할 수 있습니다.

## 5. 트러블슈팅

- **문제가 발생했을 때**: `ImageBrush` 적용 후 슬롯이 업데이트되지 않는 문제.
- **원인**: 여러 컴포넌트에서 `useSlotManager`를 개별적으로 호출하여 상태가 동기화되지 않았습니다.
- **해결**: `CanvasProviders`에서 `useSlotManager`를 한 번만 호출하고, 생성된 단일 인스턴스를 모든 하위 컴포넌트가 공유하도록 Context 구조를 마이그레이션했습니다.
- **관련 문서**: `docs/task/task_slot_manager_context_migration.md`
