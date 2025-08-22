# 기능: 프로젝트 상태 관리 (저장, 로드, 실행취소)

## 1. 개요
Video Editor의 모든 작업 내용은 하나의 "프로젝트"로 관리됩니다. 이 기능은 사용자의 작업을 안전하게 보존하고, 과거의 특정 시점으로 되돌릴 수 있게 해주는 핵심적인 부분입니다. `ProjectContext`와 `HistoryContext`가 이 기능을 담당합니다.

**주요 특징**:
- **UUID 기반 프로젝트 식별**: 각 프로젝트는 고유한 UUID로 식별
- **8자리 단축 ID**: URL에는 보안을 위해 8자리 단축 ID 사용
- **새 프로젝트 생성**: Canvas에서 직접 새 프로젝트 생성 가능
- **자동/수동 저장**: 변경사항 자동 저장 및 수동 저장 지원

## 2. 핵심 파일
- **프로젝트 상태 관리**: `src/app/video-editor/_context/ProjectContext.tsx`
- **실행취소/다시실행**: `src/app/video-editor/_context/HistoryContext.tsx`
- **데이터 저장/로드 API**: `src/app/api/video/save/route.ts`
- **프로젝트 목록 API**: `src/app/api/video/projects/route.ts`
- **새 프로젝트 생성 API**: `src/app/api/video/projects/create/route.ts`
- **프로젝트 서비스**: `src/lib/services/video-editor/project.service.ts`
- **프로젝트 생성 모달**: `src/shared/components/modals/ProjectTitleModal.tsx`
- **프로젝트 선택 모달**: `src/shared/components/modals/ProjectSelectorModal.tsx`
- **유틸리티 함수**: `src/shared/lib/utils.ts` (UUID 단축 ID 변환)
- **데이터베이스 테이블**: `project_saves` (UUID 기반)

## 3. 주요 로직 설명

### UUID 기반 프로젝트 식별 시스템

#### UUID와 단축 ID 변환
```typescript
// src/shared/lib/utils.ts
export function getShortId(uuid: string): string {
  return uuid.replace(/-/g, '').substring(0, 8);
}
```

- **UUID 형식**: `77e94f68-1234-5678-9abc-def012345678`
- **단축 ID**: `77e94f68` (하이픈 제거 후 첫 8자리)
- **URL 사용**: `/video-editor?project=77e94f68`

#### 프로젝트 검색 로직
```typescript
// src/lib/services/video-editor/project.service.ts
if (projectId.length === 8 && /^[a-f0-9]{8}$/i.test(projectId)) {
  // 8자리 단축 ID인 경우: 모든 프로젝트를 가져와서 매칭
  const targetProject = allProjects.find(project => {
    const cleanUuid = project.id.replace(/-/g, '').toLowerCase();
    return cleanUuid.startsWith(projectId.toLowerCase());
  });
}
```

**문제 해결**:
- PostgreSQL LIKE 쿼리로는 `77e94f68%` 패턴이 `77e94f68-...` 와 매칭되지 않음
- 해결책: 클라이언트 사이드에서 하이픈 제거 후 매칭

### 새 프로젝트 생성 플로우

#### 1. Canvas에서 프로젝트 생성 시작
```
Canvas → Header "Edit" 버튼 → ProjectSelectorModal → "New Project" 클릭
```

#### 2. 프로젝트 제목 입력 및 생성
```typescript
// src/shared/components/modals/ProjectTitleModal.tsx
const handleConfirm = async () => {
  const result = await createNewProject(finalTitle);
  if (result.success && result.projectId) {
    const shortId = getShortId(result.projectId);
    onConfirm(shortId, finalTitle);
  }
};
```

#### 3. DB에 빈 프로젝트 생성
```typescript
// src/app/api/video/projects/create/route.ts
const emptyProjectData = {
  projectName: validated.projectName,
  videoClips: [],
  textClips: [],
  soundClips: [],
  soundLanes: [0],
  aspectRatio: '9:16' as const,
  durationInFrames: 0,
};
```

#### 4. 단축 ID로 URL 리다이렉션
```typescript
// src/app/canvas/_components/CanvasModals.tsx
router.push(`/video-editor?project=${encodeURIComponent(projectId)}`)
```

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
- **동작**: 페이지 URL의 쿼리 파라미터에 따라 트리거됩니다.

#### 지원하는 URL 형식
```typescript
// 새로운 형식 (8자리 단축 ID)
?project=77e94f68

// 기존 형식들 (하위 호환성)
?projectName=MyProject
?projectId=77e94f68-1234-5678-9abc-def012345678
?title=MyProject  // 레거시
```

#### 로드 로직
```typescript
// src/app/video-editor/_context/ProjectContext.tsx
useEffect(() => {
  const projectParam = searchParams.get('project'); // 새로운 단축 ID
  
  if (projectParam && !projectLoaded && !isLoadingProject) {
    const shortId = decodeURIComponent(projectParam);
    loadProjectData(shortId, true); // 단축 ID로 로드
  }
  // ... 기타 파라미터 처리
}, [searchParams, projectLoaded, isLoadingProject, loadProjectData]);
```

#### 프로젝트 데이터 복원
1. `GET /api/video/save?projectId=77e94f68` API 호출
2. ProjectService에서 단축 ID로 프로젝트 검색
3. `window.dispatchEvent`로 `projectDataLoaded` 이벤트 발생
4. `ClipContext`가 이벤트 수신 후 `restoreProjectData` 호출
5. 에디터의 모든 클립 상태 복원

### 실행 취소 / 다시 실행 (Undo/Redo)
- **위치**: `HistoryContext.tsx`
- **동작**: `ClipContext`의 상태가 변경될 때마다 `HistoryContext`에 스냅샷이 저장됩니다.
- **로직**:
  1. **상태 저장 (`saveToHistory`)**: `ClipContext`의 상태 변경 함수들은 작업이 끝날 때 `saveToHistory(newState)`를 호출합니다. `HistoryContext`는 이 상태를 `history` 배열(스택)에 추가합니다.
  2. **실행 취소 (`handleUndo`)**: `historyIndex`를 하나 감소시키고, `history[historyIndex - 1]`에 저장된 과거의 상태를 `ClipContext`에 다시 적용(`restoreFromHistory`)합니다.
  3. **다시 실행 (`handleRedo`)**: `historyIndex`를 하나 증가시키고, 해당 상태를 `ClipContext`에 적용합니다.
  4. **분기 처리**: 사용자가 Undo를 한 후 새로운 편집을 시작하면, 현재 `historyIndex` 이후의 모든 미래 히스토리는 제거됩니다. 이는 새로운 편집 분기를 생성합니다.

## 4. 데이터베이스 상호작용

### project_saves 테이블 구조 (UUID 기반)
```sql
CREATE TABLE project_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- UUID 프라이머리 키
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_name TEXT NOT NULL,
  latest_render_id TEXT,
  content_snapshot JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  is_latest BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### API 엔드포인트

#### `POST /api/video/projects/create` - 새 프로젝트 생성
```typescript
// 빈 프로젝트를 DB에 생성하고 UUID 반환
const result = await service.saveProject(emptyProjectData, user);
return { projectId: result.projectSaveId };
```

#### `POST /api/video/save` - 프로젝트 저장/업데이트
- **UPSERT 로직**: `projectId`가 있으면 업데이트, 없으면 새로 생성
- **UUID 기반**: `project_name` 대신 `id` (UUID)로 고유성 보장
- **단축 ID 지원**: 8자리 ID로 기존 프로젝트 식별 가능

#### `GET /api/video/save` - 프로젝트 로드
```typescript
// 단축 ID 처리 로직
if (projectId.length === 8) {
  // 모든 사용자 프로젝트에서 매칭되는 UUID 찾기
  const targetProject = allProjects.find(project => {
    const cleanUuid = project.id.replace(/-/g, '').toLowerCase();
    return cleanUuid.startsWith(projectId.toLowerCase());
  });
}
```

#### `GET /api/video/projects` - 프로젝트 목록
- 사용자의 모든 프로젝트를 `updated_at` 기준 내림차순 정렬
- 썸네일, 최신 비디오 URL, 업데이트 시간 포함

### 스키마 검증 (Zod)
```typescript
// src/lib/services/video-editor/schemas.ts
export const loadProjectRequestSchema = z.object({
  projectName: z.string().optional(),
  projectId: z.string().min(1).optional(), // UUID 또는 8자리 단축 ID 허용
}).refine(data => data.projectName || data.projectId);
```

### 마이그레이션 히스토리
- `026_add_project_uuid.sql`: project_uuid 컬럼 추가
- `030_finalize_uuid_migration.sql`: project_uuid를 id로 변경하여 프라이머리 키로 설정
- 기존 BIGINT id에서 UUID 기반 시스템으로 완전 전환

## 5. 구현 시 발생한 문제와 해결 과정

### 문제 1: Zod 스키마 검증 실패 (400 에러)
**원인**: 8자리 단축 ID가 UUID 형식 검증에서 실패
```typescript
// 문제 코드
projectId: z.string().uuid().optional()

// 해결 코드  
projectId: z.string().min(1).optional() // UUID 또는 단축 ID 허용
```

### 문제 2: PostgreSQL LIKE 쿼리 매칭 실패 (500 에러)
**원인**: `77e94f68%` 패턴이 `77e94f68-1234-...` UUID와 매칭되지 않음
```typescript
// 시도한 방법들 (실패)
query.like('id', `${projectId}%`)
query.filter('id', 'like', `${projectId}%`)

// 최종 해결책 (성공)
const targetProject = allProjects.find(project => {
  const cleanUuid = project.id.replace(/-/g, '').toLowerCase();
  return cleanUuid.startsWith(projectId.toLowerCase());
});
```

### 문제 3: React useEffect 무한루프
**원인**: useCallback 의존성 배열에서 router 누락
```typescript
// 문제 코드
const createNewProjectAndRedirect = useCallback(async () => {
  router.replace(`/video-editor?project=${shortId}`);
}, [isLoadingProject]); // router 의존성 누락

// 해결 코드
const createNewProjectAndRedirect = useCallback(async () => {
  router.replace(`/video-editor?project=${shortId}`);
}, [isLoadingProject, router]); // router 의존성 추가
```

## 6. 주의사항 및 베스트 프랙티스

### UUID 처리
- UUID는 항상 하이픈을 포함한 표준 형식으로 저장
- 단축 ID 생성 시 하이픈 제거 후 소문자로 변환
- PostgreSQL UUID 타입 사용으로 성능과 저장 공간 최적화

### 보안 고려사항
- URL에 8자리 단축 ID만 노출하여 전체 UUID 유추 방지
- 사용자별 프로젝트 접근 권한 검증 (user_id 필터링)
- RLS (Row Level Security) 정책으로 데이터 보호

### 성능 최적화
- 사용자당 프로젝트 수가 적을 것으로 예상하여 클라이언트 사이드 필터링 채택
- 필요시 PostgreSQL 함수 또는 인덱스 추가 고려
- 프로젝트 목록 페이지네이션 구현 검토

### React Hook 의존성 관리
- ESLint `react-hooks/exhaustive-deps` 규칙 준수
- useCallback/useEffect에서 사용하는 모든 변수를 의존성 배열에 포함
- Stale closure 문제 방지를 위한 useRef 활용 고려
