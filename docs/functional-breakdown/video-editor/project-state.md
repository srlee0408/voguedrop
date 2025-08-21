# 기능: 프로젝트 상태 관리 (저장, 로드, 실행취소)

## 1. 개요
Video Editor의 모든 작업 내용은 하나의 "프로젝트"로 관리됩니다. 이 기능은 사용자의 작업을 안전하게 보존하고, 과거의 특정 시점으로 되돌릴 수 있게 해주는 핵심적인 부분입니다. `ProjectContext`와 `HistoryContext`가 이 기능을 담당합니다.

## 2. 핵심 파일
- **프로젝트 상태 관리**: `src/app/video-editor/_context/ProjectContext.tsx`
- **실행취소/다시실행**: `src/app/video-editor/_context/HistoryContext.tsx`
- **데이터 저장/로드 API**: `src/app/api/video/save/route.ts`
- **프로젝트 목록 API**: `src/app/api/video/projects/route.ts`
- **데이터베이스 테이블**: `project_saves`

## 3. 주요 로직 설명

### 프로젝트 상태 스냅샷 (`content_snapshot`)
- 프로젝트의 모든 상태는 하나의 JSON 객체인 `content_snapshot`으로 직렬화되어 DB에 저장됩니다.
- 이 객체에는 비디오, 텍스트, 사운드 클립의 모든 정보(위치, 길이, 소스, 스타일 등)가 포함됩니다.

```typescript
// content_snapshot의 구조 예시
{
  "version": "1.0",
  "aspect_ratio": "9:16",
  "duration_frames": 3600,
  "video_clips": [ { "id": "...", "url": "..." } ],
  "text_clips": [ { "id": "...", "text": "..." } ],
  "sound_clips": [ { "id": "...", "url": "..." } ],
  "content_hash": "..."
}
```

### 자동 저장 (`useAutoSave`)
- **위치**: `ProjectContext.tsx`
- **동작**: `ClipContext`의 `lastModifiedAt` 타임스탬프를 감지하는 `useEffect`를 사용합니다.
- **로직**:
  1. 클립 데이터가 변경되면 `lastModifiedAt`이 업데이트됩니다.
  2. `ProjectContext`는 이 변경을 감지하고 디바운스(debounce) 타이머(예: 2초)를 시작합니다.
  3. 2초 동안 추가 변경이 없으면, `handleSaveProject` 함수를 호출하여 백엔드에 현재 `content_snapshot`을 전송합니다.
  4. `autoSaveStatus` 상태('saving', 'saved', 'error')를 업데이트하여 UI에 피드백을 제공합니다.

### 프로젝트 로드 (`loadProject`)
- **위치**: `ProjectContext.tsx`
- **동작**: 페이지 URL에 `?projectName=...` 쿼리 파라미터가 있을 때 트리거됩니다.
- **로직**:
  1. `GET /api/video/save?projectName=...` API를 호출하여 DB에서 `content_snapshot`을 가져옵니다.
  2. `window.dispatchEvent`를 사용하여 `projectDataLoaded`라는 커스텀 이벤트를 발생시킵니다. 이 이벤트에는 불러온 `content_snapshot` 데이터가 포함됩니다.
  3. `ClipContext`가 이 이벤트를 수신하고, `restoreProjectData` 함수를 호출하여 에디터의 모든 클립 상태를 복원합니다.

### 실행 취소 / 다시 실행 (Undo/Redo)
- **위치**: `HistoryContext.tsx`
- **동작**: `ClipContext`의 상태가 변경될 때마다 `HistoryContext`에 스냅샷이 저장됩니다.
- **로직**:
  1. **상태 저장 (`saveToHistory`)**: `ClipContext`의 상태 변경 함수들은 작업이 끝날 때 `saveToHistory(newState)`를 호출합니다. `HistoryContext`는 이 상태를 `history` 배열(스택)에 추가합니다.
  2. **실행 취소 (`handleUndo`)**: `historyIndex`를 하나 감소시키고, `history[historyIndex - 1]`에 저장된 과거의 상태를 `ClipContext`에 다시 적용(`restoreFromHistory`)합니다.
  3. **다시 실행 (`handleRedo`)**: `historyIndex`를 하나 증가시키고, 해당 상태를 `ClipContext`에 적용합니다.
  4. **분기 처리**: 사용자가 Undo를 한 후 새로운 편집을 시작하면, 현재 `historyIndex` 이후의 모든 미래 히스토리는 제거됩니다. 이는 새로운 편집 분기를 생성합니다.

## 4. 데이터베이스 상호작용
- **`POST /api/video/save`**: `UPSERT` 로직을 사용합니다. `user_id`와 `project_name`이 동일한 레코드가 있으면 `content_snapshot`을 업데이트하고, 없으면 새로 생성합니다. 이를 통해 "Save"와 "Save As"가 아닌 단일 저장 로직으로 구현됩니다.
- **`GET /api/video/projects`**: 사용자의 모든 프로젝트 목록을 `updated_at` 기준으로 내림차순 정렬하여 반환합니다.
