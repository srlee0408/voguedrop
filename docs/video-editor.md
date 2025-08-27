# Video Editor 상세 가이드

> **참고**: 전체 아키텍처 개요는 [architecture-guide.md](./architecture-guide.md)를 참조하세요.

이 문서는 VogueDrop Video Editor의 Context 기반 상태 관리 아키텍처를 설명합니다. 커밋 6757c12에서 단일 파일(400줄)을 여러 전문화된 Context로 분리한 대규모 리팩토링 결과를 다룹니다.

## 개요

Video Editor는 4개의 핵심 Context와 1개의 통합 Provider로 구성되어 있습니다. 각 Context는 단일 책임 원칙(Single Responsibility Principle)을 따르며, 명확한 경계와 역할을 가집니다.

### 아키텍처 원칙

- **관심사 분리**: 각 Context는 하나의 핵심 기능만 담당
- **명확한 의존성**: Context 간 의존 관계가 명시적이고 단방향
- **타입 안전성**: 모든 상태와 함수에 TypeScript 타입 정의
- **성능 최적화**: useMemo, useCallback으로 불필요한 리렌더링 방지

## Context 구조

### 계층 구조

```
VideoEditorProviders
├── ProjectProvider (프로젝트 메타데이터, UI 상태)
│   └── ClipProvider (클립 관리, 편집 상태)
│       └── HistoryProvider (실행 취소/다시 실행)
│           └── PlaybackProvider (재생 제어)
│               └── HistoryConnector (Context 간 연결)
```

### 의존성 그래프

```mermaid
graph TD
    A[ProjectProvider] --> B[ClipProvider]
    B --> C[HistoryProvider]
    B --> D[PlaybackProvider]
    C --> E[HistoryConnector]
    B --> E
    
    A -.-> B: CustomEvent
    B -.-> C: Callback
    B -.-> D: State Reading
```

## Context 상세 설명

### 1. ProjectContext

**역할**: 프로젝트 메타데이터 및 UI 상태 관리

**관리 상태**:
- 프로젝트 정보: `projectTitle`, 로드 상태, 에러 상태
- 자동 저장: `autoSaveStatus`, 에러 추적
- UI 레이아웃: 타임라인 높이, 리사이징 상태
- 모달 관리: 비디오/사운드/텍스트 라이브러리 모달
- DOM 참조: 메인 컨테이너 ref

**주요 기능**:
- URL 파라미터를 통한 프로젝트 자동 로드
- 타임라인 높이 드래그 리사이징 (100-240px)
- 모달 열기/닫기 상태 관리
- CustomEvent로 ClipContext에 프로젝트 데이터 전달

**파일**: `src/app/video-editor/_context/ProjectContext.tsx`

```typescript
// 사용 예제
function ProjectHeader() {
  const { projectTitle, setProjectTitle, autoSaveStatus } = useProject();
  
  return (
    <div>
      <input value={projectTitle} onChange={e => setProjectTitle(e.target.value)} />
      <span>{autoSaveStatus === 'saving' ? '저장 중...' : '저장됨'}</span>
    </div>
  );
}
```

### 2. ClipContext

**역할**: 모든 클립(비디오, 텍스트, 사운드)의 생명주기 관리

**관리 상태**:
- 비디오 클립: `timelineClips[]` - 타임라인의 비디오 세그먼트
- 텍스트 클립: `textClips[]` - 화면 오버레이 텍스트
- 사운드 클립: `soundClips[]` - 오디오 트랙 사운드
- 편집 상태: 선택된 클립, 편집 중인 클립
- 변경 추적: `hasUnsavedChanges`, `lastModifiedAt`

**주요 기능**:
- CRUD 작업: 클립 생성, 읽기, 수정, 삭제
- 고급 편집: 복제, 분할, 리사이즈, 위치 조정
- 타임라인 제한: 2분(120초) 길이 제한 및 경고
- 프로젝트 연동: 'projectDataLoaded' 이벤트 수신 및 복원
- 히스토리 연동: 상태 변경 시 saveToHistory 호출

**파일**: `src/app/video-editor/_context/ClipContext.tsx`

```typescript
// 사용 예제
function Timeline() {
  const { 
    timelineClips, 
    handleAddToTimeline, 
    handleDeleteVideoClip,
    handleSplitVideoClip 
  } = useClips();
  const { currentTime } = usePlayback();
  
  return (
    <div>
      {timelineClips.map(clip => (
        <VideoClip 
          key={clip.id}
          clip={clip}
          onDelete={() => handleDeleteVideoClip(clip.id)}
          onSplit={() => handleSplitVideoClip(clip.id)}
        />
      ))}
    </div>
  );
}
```

### 3. HistoryContext

**역할**: 실행 취소/다시 실행 기능 제공

**관리 상태**:
- 히스토리 스택: `history[]` - 최대 50개 상태 스냅샷
- 현재 위치: `historyIndex` - 히스토리 내 현재 인덱스
- 가능 여부: `canUndo`, `canRedo` - 실행 가능 상태

**주요 기능**:
- 상태 저장: 클립 변경 시 자동 히스토리 저장
- 중복 방지: 동일 상태는 저장하지 않음
- 분기 처리: Undo 후 새 작업 시 미래 히스토리 제거
- 메모리 관리: 최대 50개 초과 시 오래된 항목 제거

**파일**: `src/app/video-editor/_context/HistoryContext.tsx`

```typescript
// 사용 예제
function UndoRedoButtons() {
  const { canUndo, canRedo, handleUndo, handleRedo } = useHistory();
  
  // 키보드 단축키 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) handleUndo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        if (canRedo) handleRedo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, handleUndo, handleRedo]);
  
  return (
    <div>
      <button onClick={handleUndo} disabled={!canUndo}>Undo (Ctrl+Z)</button>
      <button onClick={handleRedo} disabled={!canRedo}>Redo (Ctrl+Y)</button>
    </div>
  );
}
```

### 4. PlaybackContext

**역할**: Remotion Player와 연동한 재생 제어

**관리 상태**:
- 재생 상태: `isPlaying`, `currentTime`, `totalDuration`
- Player 참조: `playerRef` - Remotion Player 인스턴스
- 프레임 추적: `prevFrameRef` - 재생 완료 감지용

**주요 기능**:
- 재생 제어: 재생/일시정지, 시간 탐색(seek)
- 자동 완료: 재생 끝 도달 시 자동 정지
- 프레임 동기화: 30fps 기준 정밀 제어, 중복 업데이트 방지
- 상태 폴링: 100ms 간격으로 재생 상태 업데이트
- 시간 계산: 모든 클립을 고려한 총 재생 시간

**파일**: `src/app/video-editor/_context/PlaybackContext.tsx`

```typescript
// 사용 예제
function PlayerControls() {
  const { 
    isPlaying, 
    currentTime, 
    totalDuration, 
    handlePlayPause, 
    handleSeek 
  } = usePlayback();
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div>
      <button onClick={handlePlayPause}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <input 
        type="range"
        min={0}
        max={totalDuration}
        value={currentTime}
        onChange={(e) => handleSeek(Number(e.target.value))}
      />
      <span>{formatTime(currentTime)} / {formatTime(totalDuration)}</span>
    </div>
  );
}
```

### 5. VideoEditorProviders

**역할**: 모든 Context를 올바른 순서로 조합

**계층 순서**:
1. **ProjectProvider**: 독립적, 다른 Context에 의존하지 않음
2. **ClipProvider**: ProjectProvider의 이벤트를 수신
3. **HistoryProvider**: ClipProvider의 상태를 참조
4. **PlaybackProvider**: ClipProvider의 클립 정보를 참조
5. **HistoryConnector**: ClipProvider와 HistoryProvider 연결

**파일**: `src/app/video-editor/_context/Providers.tsx`

```typescript
// 사용법
export default function VideoEditorPage() {
  return (
    <VideoEditorProviders>
      <VideoEditorClient />
    </VideoEditorProviders>
  );
}
```

## Context 간 상호작용

### 1. 프로젝트 로드 플로우

```
1. ProjectProvider: URL에서 projectName 파라미터 감지
2. ProjectProvider: loadProject() API 호출
3. ProjectProvider: 'projectDataLoaded' CustomEvent 발생
4. ClipProvider: 이벤트 수신 → restoreProjectData() 실행
5. ClipProvider: timelineClips, textClips, soundClips 복원
6. HistoryProvider: 복원된 상태를 초기 히스토리로 저장
```

### 2. 클립 편집 플로우

```
1. 사용자: 클립 추가/수정/삭제 액션
2. ClipProvider: 상태 업데이트 (timelineClips 등)
3. ClipProvider: saveToHistory() 콜백 호출
4. HistoryProvider: 현재 상태를 히스토리에 저장
5. PlaybackProvider: 클립 변경 감지 → totalDuration 재계산
```

### 3. 재생 제어 플로우

```
1. 사용자: 재생 버튼 클릭
2. PlaybackProvider: handlePlayPause() 실행
3. PlaybackProvider: ClipContext에서 모든 클립 정보 읽기
4. PlaybackProvider: 총 재생 시간 계산
5. PlaybackProvider: Remotion Player에 재생 명령
6. PlaybackProvider: 100ms 간격으로 currentTime 업데이트
```

## 성능 최적화

### 1. 메모이제이션

모든 Context에서 `useMemo`와 `useCallback`을 적극 활용:

```typescript
// Context value 최적화
const value = useMemo(() => ({
  timelineClips,
  textClips,
  soundClips,
  handleAddToTimeline,
  handleDeleteVideoClip,
  // ... 모든 속성
}), [
  timelineClips,
  textClips,
  soundClips,
  // ... 의존성 배열
]);
```

### 2. 상태 분리

각 Context가 독립적인 상태를 관리하여 불필요한 리렌더링 방지:

- ProjectContext: UI 상태 변경이 클립 편집에 영향 없음
- ClipContext: 클립 변경이 재생 상태에 직접 영향 없음
- PlaybackContext: 재생 상태 변경이 히스토리에 영향 없음

### 3. 이벤트 기반 통신

Context 간 직접 의존 대신 이벤트 기반 통신 사용:

```typescript
// ProjectProvider → ClipProvider
const event = new CustomEvent('projectDataLoaded', {
  detail: project.content_snapshot
});
window.dispatchEvent(event);

// ClipProvider에서 수신
useEffect(() => {
  const handleProjectDataLoaded = (event: CustomEvent) => {
    restoreProjectData(event.detail);
  };
  
  window.addEventListener('projectDataLoaded', handleProjectDataLoaded);
  return () => window.removeEventListener('projectDataLoaded', handleProjectDataLoaded);
}, []);
```

## 리팩토링 전후 비교

### Before (단일 파일)
- **파일 크기**: page.tsx 400줄
- **상태 관리**: 모든 상태가 하나의 컴포넌트에 집중
- **책임**: 하나의 컴포넌트가 모든 기능 담당
- **재사용성**: 낮음, 다른 페이지에서 일부 기능만 사용 불가
- **테스트**: 어려움, 전체 컴포넌트를 마운트해야 함

### After (Context 분리)
- **파일 구조**: 5개 Context + 1개 Provider
- **상태 관리**: 기능별로 분산된 상태 관리
- **책임**: 각 Context가 하나의 핵심 기능만 담당
- **재사용성**: 높음, 필요한 Context만 선택적 사용 가능
- **테스트**: 쉬움, 각 Context를 독립적으로 테스트 가능

### 구체적 개선사항

1. **코드 가독성**: 400줄 → 각 파일 100-300줄
2. **유지보수성**: 기능별 파일 분리로 변경 영향 범위 최소화
3. **확장성**: 새로운 기능 추가 시 기존 Context에 영향 없음
4. **타입 안전성**: 각 Context별 명확한 타입 정의
5. **성능**: Context별 최적화로 불필요한 리렌더링 방지

## 모범 사례

### 1. Context 설계 원칙

- **단일 책임**: 하나의 Context는 하나의 핵심 기능만
- **명확한 경계**: Context 간 책임 영역이 겹치지 않음
- **최소 의존성**: 다른 Context에 대한 의존을 최소화
- **타입 안전성**: 모든 상태와 함수에 TypeScript 타입

### 2. 상태 업데이트 패턴

```typescript
// 좋은 예: 불변 업데이트
setTimelineClips(prev => prev.map(clip => 
  clip.id === id ? { ...clip, duration: newDuration } : clip
));

// 나쁜 예: 직접 변경
timelineClips[index].duration = newDuration;
setTimelineClips(timelineClips);
```

### 3. 에러 경계 설정

각 Context에서 적절한 에러 처리:

```typescript
export function useClips() {
  const context = useContext(ClipContext);
  if (!context) {
    throw new Error('useClips must be used within ClipProvider');
  }
  return context;
}
```

## 향후 확장 가능성

현재 아키텍처는 다음과 같은 확장을 지원할 수 있습니다:

1. **새로운 Context 추가**: 효과, 필터, 색상 보정 등
2. **Context 조합**: 다른 에디터(이미지, 오디오)에서 일부 Context 재사용
3. **플러그인 시스템**: 외부 Context를 동적으로 추가
4. **상태 지속성**: Context별로 localStorage, IndexedDB 연동
5. **실시간 협업**: Context 상태를 WebSocket으로 동기화

## 결론

Context 기반 아키텍처로의 리팩토링은 Video Editor의 유지보수성, 확장성, 성능을 크게 향상시켰습니다. 각 Context가 명확한 책임을 가지고 있어 새로운 기능 추가나 기존 기능 수정이 다른 부분에 미치는 영향을 최소화할 수 있습니다.

이 아키텍처는 관심사 분리, 단일 책임 원칙, 의존성 역전 등의 소프트웨어 설계 원칙을 React Context API와 함께 적용한 모범 사례로 활용할 수 있습니다.