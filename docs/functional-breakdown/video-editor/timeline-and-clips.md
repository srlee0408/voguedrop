# 기능: 타임라인 및 클립 관리

## 1. 개요
Video Editor의 핵심 기능으로, 사용자가 비디오, 텍스트, 사운드 클립을 시각적으로 배열하고 조작(자르기, 이동, 분할 등)할 수 있는 인터페이스입니다. 이 모든 로직은 `ClipContext`를 중심으로 관리됩니다.

## 2. 핵심 파일
- **상태 및 로직**: `src/app/video-editor/_context/ClipContext.tsx`
- **UI 컴포넌트**: `src/app/video-editor/_components/Timeline.tsx`
- **클립 조작 유틸리티**: `src/app/video-editor/_utils/clip-operations.ts`
- **버그 해결 문서**: `docs/timeline-resize-width-zero-bug.md`

## 3. 상태 구조
`ClipContext`는 세 가지 종류의 클립 배열을 관리합니다.

```typescript
interface ClipContextValue {
  // 비디오 트랙의 클립들
  timelineClips: VideoClip[];
  // 텍스트 오버레이 클립들
  textClips: TextClip[];
  // 사운드 트랙의 클립들
  soundClips: SoundClip[];

  // 현재 선택/편집 중인 클립 ID
  selectedClipId: string | null;
  editingClipId: string | null;

  // 클립 조작 함수들
  handleAddToTimeline: (videos: VideoAsset[]) => void;
  handleDeleteVideoClip: (clipId: string) => void;
  handleResizeVideoClip: (clip: VideoClip, newDuration: number, newStartTime: number) => void;
  handleMoveVideoClip: (clipId: string, newPosition: number) => void;
  handleSplitVideoClip: (clipId: string) => void;
  // ... 텍스트 및 사운드 클립용 함수들
}
```

## 4. 주요 로직 설명

### 클립 추가 (`handleAddToTimeline`)
1.  비디오 라이브러리에서 선택된 비디오 에셋 배열을 인자로 받습니다.
2.  각 비디오에 대해 새로운 `VideoClip` 객체를 생성합니다. 이 때 고유 ID(`uuidv4`)를 할당합니다.
3.  타임라인의 마지막 클립 뒤에 순차적으로 추가합니다.
4.  타임라인 총 길이가 2분(120초)을 초과하는지 확인하고, 초과 시 경고를 표시하며 추가를 막습니다.
5.  `setTimelineClips`를 호출하여 상태를 업데이트하고, 이 변경사항을 `HistoryContext`에 기록합니다.

### 클립 리사이즈 (`handleResizeVideoClip`)
- **UI 동작**: `Timeline.tsx`에서 클립의 양쪽 끝에 있는 핸들을 드래그하여 시작됩니다. `onMouseDown`, `onMouseMove`, `onMouseUp` 이벤트를 사용합니다.
- **로직**: `onMouseMove` 이벤트가 발생할 때마다 마우스의 수평 이동 거리를 픽셀 단위로 계산하고, 이를 시간 단위로 변환하여 새로운 `duration`과 `startTime`을 계산합니다.
- **제약 조건**:
  - 클립의 길이는 원본 비디오의 길이를 초과할 수 없습니다.
  - 클립의 시작 시간은 0보다 작을 수 없습니다.
  - 다른 클립과 겹칠 수 없습니다.
- **상태 업데이트**: `onMouseUp` 시점에 최종 계산된 값으로 `handleResizeVideoClip`을 호출하여 `ClipContext`의 상태를 업데이트합니다.
- **버그 해결**: 리사이즈 시 너비가 0이 되는 버그는 `onMouseUp` 시 인라인 스타일을 즉시 제거하던 문제 때문이었습니다. React의 다음 렌더링 사이클이 스타일을 덮어쓰도록 인라인 스타일 제거 코드를 삭제하여 해결했습니다. (상세: `docs/timeline-resize-width-zero-bug.md`)

### 클립 분할 (`handleSplitVideoClip`)
1.  `PlaybackContext`에서 현재 재생 시간(`currentTime`)을 가져옵니다.
2.  선택된 클립을 `currentTime` 기준으로 두 개의 클립으로 나눕니다.
3.  기존 클립을 제거하고, 두 개의 새로운 클립을 `timelineClips` 배열에 삽입합니다.
4.  각 클립의 `sourceStartTime`과 `duration`을 재계산하여 비디오의 올바른 부분이 재생되도록 합니다.

## 5. Context 간의 상호작용
- **`ProjectContext`**: 프로젝트를 불러올 때, `ClipContext`의 `restoreProjectData` 함수를 호출하여 저장된 클립 상태를 복원합니다.
- **`HistoryContext`**: `ClipContext`의 모든 상태 변경 함수(추가, 삭제, 수정 등)는 마지막에 `saveToHistory`를 호출하여 Undo/Redo 스택에 현재 상태를 기록합니다.
- **`PlaybackContext`**: `ClipContext`의 `timelineClips` 배열을 참조하여 전체 비디오의 총 길이를 계산하고, 재생 헤드의 위치를 타임라인에 시각적으로 표시합니다.
