# Task: 프로젝트 불러오기 기능 (Project Loader)

## 📋 개요
사용자가 이전에 작업했던 프로젝트를 목록에서 선택하여 Video Editor에서 계속 작업할 수 있는 기능입니다. Edit 버튼을 클릭하면 저장된 프로젝트 목록을 보여주고, 선택한 프로젝트의 모든 상태(비디오 클립, 텍스트, 사운드)를 복원합니다.

## 🎯 목표
- 사용자가 과거 작업을 쉽게 이어서 할 수 있도록 지원
- 시각적인 프로젝트 선택 UI 제공 (썸네일 기반)
- 프로젝트 상태를 완벽하게 복원하여 작업 연속성 보장

## 🏗️ 기술 스택
- **Frontend**: Next.js App Router, React Context API
- **Backend**: Next.js API Routes
- **Database**: Supabase (project_saves 테이블)
- **State Management**: Context API (ProjectContext, ClipContext)

## 📊 데이터베이스 스키마

### project_saves 테이블 (기존)
```sql
- id: BIGINT (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- project_name: TEXT (유니크 제약 with user_id)
- latest_render_id: TEXT
- latest_video_url: TEXT
- thumbnail_url: TEXT
- content_snapshot: JSONB
  - version: string
  - aspect_ratio: '9:16' | '1:1' | '16:9'
  - duration_frames: number
  - video_clips: array
  - text_clips: array
  - sound_clips: array
  - content_hash: string
- content_hash: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## 🔄 구현 플로우

### 1. Edit 버튼 클릭
```typescript
// 예: Header 컴포넌트 또는 홈페이지
<Button onClick={openProjectSelector}>
  Edit
</Button>
```

### 2. 프로젝트 목록 조회
```typescript
// GET /api/video/projects
// Response:
{
  projects: [
    {
      id: number,
      project_name: string,
      thumbnail_url: string | null,
      latest_video_url: string | null,
      updated_at: string,
      duration_frames: number
    }
  ]
}
```

### 3. 프로젝트 선택 모달
- 그리드 레이아웃으로 프로젝트 카드 표시
- 썸네일, 제목, 수정 날짜 표시
- "새 프로젝트 시작" 옵션 제공

### 4. Video Editor로 이동
```typescript
// 프로젝트 선택 시
router.push(`/video-editor?projectName=${encodeURIComponent(projectName)}`);

// 새 프로젝트 시작 시
router.push('/video-editor');
```

### 5. 프로젝트 데이터 로드 및 복원
```typescript
// ProjectContext에서 URL 파라미터 감지
useEffect(() => {
  const projectName = searchParams.get('projectName');
  if (projectName) {
    loadProject(projectName);
  }
}, [searchParams]);

// 프로젝트 로드 함수
async function loadProject(projectName: string) {
  const response = await fetch(`/api/video/save?projectName=${projectName}`);
  const { project } = await response.json();
  
  // 상태 복원
  setProjectTitle(project.project_name);
  setVideoClips(project.content_snapshot.video_clips);
  setTextClips(project.content_snapshot.text_clips);
  setSoundClips(project.content_snapshot.sound_clips);
}
```

## 📁 파일 구조

### 새로 생성할 파일

#### 1. `/app/api/video/projects/route.ts`
```typescript
export async function GET(request: NextRequest) {
  // 1. 사용자 인증 확인
  const { user } = await requireAuth(request);
  
  // 2. 사용자의 모든 프로젝트 조회
  const { data: projects } = await supabase
    .from('project_saves')
    .select('id, project_name, thumbnail_url, latest_video_url, updated_at, content_snapshot->duration_frames')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
    
  return NextResponse.json({ projects });
}
```

#### 2. `/components/modals/ProjectSelectorModal.tsx`
```typescript
interface ProjectSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectSelectorModal({ isOpen, onClose }: ProjectSelectorModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // 프로젝트 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);
  
  const handleProjectSelect = (projectName: string) => {
    router.push(`/video-editor?projectName=${encodeURIComponent(projectName)}`);
    onClose();
  };
  
  const handleNewProject = () => {
    router.push('/video-editor');
    onClose();
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* 프로젝트 그리드 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 새 프로젝트 카드 */}
        <ProjectCard
          isNew
          onClick={handleNewProject}
        />
        
        {/* 기존 프로젝트 카드들 */}
        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => handleProjectSelect(project.project_name)}
          />
        ))}
      </div>
    </Modal>
  );
}
```

#### 3. `/lib/api/projects.ts`
```typescript
// 프로젝트 관련 API 유틸리티 함수들
export async function fetchUserProjects(): Promise<Project[]> {
  const response = await fetch('/api/video/projects');
  if (!response.ok) throw new Error('Failed to fetch projects');
  const { projects } = await response.json();
  return projects;
}

export async function loadProject(projectName: string): Promise<ProjectSave> {
  const response = await fetch(`/api/video/save?projectName=${encodeURIComponent(projectName)}`);
  if (!response.ok) throw new Error('Failed to load project');
  const { project } = await response.json();
  return project;
}
```

### 수정할 파일

#### 1. `/app/video-editor/_context/ProjectContext.tsx`
```typescript
// 프로젝트 로드 기능 추가
interface ProjectContextType {
  // ... 기존 속성들
  loadProject: (projectName: string) => Promise<void>;
  isLoadingProject: boolean;
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const searchParams = useSearchParams();
  
  // URL 파라미터에서 projectName 감지
  useEffect(() => {
    const projectName = searchParams.get('projectName');
    if (projectName && !isLoadingProject) {
      loadProject(decodeURIComponent(projectName));
    }
  }, [searchParams]);
  
  const loadProject = async (projectName: string) => {
    setIsLoadingProject(true);
    try {
      const project = await api.loadProject(projectName);
      setProjectTitle(project.project_name);
      // ClipContext에 데이터 전달
      // ...
    } finally {
      setIsLoadingProject(false);
    }
  };
}
```

#### 2. `/app/video-editor/_context/ClipContext.tsx`
```typescript
// 프로젝트 데이터 복원 함수 추가
interface ClipContextType {
  // ... 기존 속성들
  restoreProjectData: (snapshot: ContentSnapshot) => void;
}

const restoreProjectData = (snapshot: ContentSnapshot) => {
  // 비디오 클립 복원
  const videoClips = snapshot.video_clips.map(clip => ({
    ...clip,
    id: clip.id || uuidv4(),
    // 필요한 변환 작업
  }));
  setTimelineClips(videoClips);
  
  // 텍스트 클립 복원
  setTextClips(snapshot.text_clips || []);
  
  // 사운드 클립 복원
  setSoundClips(snapshot.sound_clips || []);
  
  // 히스토리 초기화
  clearHistory();
};
```

## 🎨 UI/UX 설계

### ProjectSelectorModal 디자인
```
┌─────────────────────────────────────────┐
│         Select a Project                 │
├─────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │  +   │  │ 📷   │  │ 📷   │          │
│  │ New  │  │Proj1 │  │Proj2 │          │
│  │      │  │2 days│  │1 week│          │
│  └──────┘  └──────┘  └──────┘          │
│                                          │
│  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │ 📷   │  │ 📷   │  │ 📷   │          │
│  │Proj3 │  │Proj4 │  │Proj5 │          │
│  │2 weeks│ │1 month│ │2 months│        │
│  └──────┘  └──────┘  └──────┘          │
└─────────────────────────────────────────┘
```

### 프로젝트 카드 구성
- 썸네일 이미지 (16:9 비율)
- 프로젝트 이름
- 마지막 수정 시간 (상대 시간)
- 호버 시 편집 아이콘 표시

## 🧪 테스트 시나리오

### 1. 프로젝트 목록 조회
- 로그인한 사용자의 프로젝트만 표시되는지 확인
- 최신순 정렬 확인
- 썸네일 URL이 올바르게 표시되는지 확인

### 2. 프로젝트 로드
- 선택한 프로젝트의 모든 클립이 복원되는지 확인
- 타임라인 위치와 duration이 올바른지 확인
- 텍스트 스타일과 사운드 볼륨 설정이 유지되는지 확인

### 3. 새 프로젝트 시작
- URL 파라미터 없이 빈 에디터로 이동하는지 확인
- 기존 상태가 초기화되는지 확인

### 4. 에러 처리
- 존재하지 않는 프로젝트명 처리
- 권한 없는 프로젝트 접근 차단
- 네트워크 오류 시 적절한 메시지 표시

## 🚀 배포 체크리스트

- [ ] API 엔드포인트 생성 및 테스트
- [ ] ProjectSelectorModal 컴포넌트 구현
- [ ] Context 수정 및 데이터 복원 로직 구현
- [ ] Edit 버튼과 모달 연결
- [ ] 로딩 상태 및 에러 처리
- [ ] 반응형 디자인 적용
- [ ] 성능 최적화 (이미지 lazy loading)
- [ ] 접근성 고려 (키보드 네비게이션)

## 📈 향후 개선 사항

1. **프로젝트 관리 기능**
   - 프로젝트 이름 변경
   - 프로젝트 삭제
   - 프로젝트 복제

2. **검색 및 필터링**
   - 프로젝트 이름으로 검색
   - 날짜별 필터링
   - 태그 시스템 도입

3. **협업 기능**
   - 프로젝트 공유
   - 읽기 전용 링크 생성
   - 공동 편집 (실시간 동기화)

4. **버전 관리**
   - 프로젝트 히스토리 보기
   - 특정 시점으로 롤백
   - 변경 사항 비교

## 📚 참고 자료

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [React Context API](https://react.dev/reference/react/createContext)
- 기존 구현 파일:
  - `/app/api/video/save/route.ts` (저장/로드 API)
  - `/app/video-editor/_context/ProjectContext.tsx` (프로젝트 상태 관리)
  - `/types/database.ts` (데이터베이스 타입 정의)