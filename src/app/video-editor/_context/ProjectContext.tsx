'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadProject, createNewProject } from '@/lib/api/projects';
import { getShortId } from '@/shared/lib/utils';
import type { SaveStatus } from '../_hooks/useManualSave';

/**
 * 프로젝트 관리 Context의 타입 정의
 * 
 * 이 Context는 Video Editor의 프로젝트 메타데이터, UI 상태, 모달 관리 등
 * 편집 내용 외의 모든 상태를 중앙 집중식으로 관리합니다.
 * 프로젝트 로드/저장, 자동 저장, UI 레이아웃, 모달 표시 등을 담당합니다.
 * 
 * @interface ProjectContextType
 */
interface ProjectContextType {
  // 프로젝트 메타데이터
  /** 현재 프로젝트의 UUID (저장된 프로젝트인 경우) */
  projectId: string | null;
  /** 프로젝트 ID 설정 함수 */
  setProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  /** 현재 프로젝트의 제목 ("Untitled Project" 기본값) */
  projectTitle: string;
  /** 프로젝트 제목 설정 함수 */
  setProjectTitle: React.Dispatch<React.SetStateAction<string>>;
  
  // 프로젝트 로드 상태
  /** 프로젝트 데이터를 로딩 중인지 여부 */
  isLoadingProject: boolean;
  /** 프로젝트 로드 중 발생한 에러 메시지 (null이면 에러 없음) */
  projectLoadError: string | null;
  /** 프로젝트 이름 또는 ID로 데이터를 로드하는 함수 */
  loadProjectData: (projectNameOrId: string, isId?: boolean) => Promise<void>;
  
  // 저장 상태
  /** 저장 상태 ('idle' | 'saving' | 'saved' | 'error') */
  saveStatus: SaveStatus;
  /** 저장 상태 설정 함수 */
  setSaveStatus: React.Dispatch<React.SetStateAction<SaveStatus>>;
  /** 저장 중 발생한 에러 메시지 */
  saveError: string | null;
  /** 저장 에러 설정 함수 */
  setSaveError: React.Dispatch<React.SetStateAction<string | null>>;
  
  // 타임라인 UI 상태
  /** 타임라인 영역의 높이 (픽셀 단위, 100-240px 범위) */
  timelineHeight: number;
  /** 타임라인 리사이징 중인지 여부 */
  isResizing: boolean;
  /** 드래그 시작 시점의 Y 좌표 */
  dragStartY: number;
  /** 드래그 시작 시점의 높이 */
  initialHeight: number;
  /** 타임라인 최대 높이 제한 (240px) */
  maxTimelineHeight: number;
  
  // 타임라인 리사이징 함수
  /** 리사이저 드래그 시작 핸들러 */
  handleResizerMouseDown: (e: React.MouseEvent) => void;
  /** 타임라인 높이 직접 설정 함수 */
  setTimelineHeight: React.Dispatch<React.SetStateAction<number>>;
  
  // 모달 상태
  /** 비디오 라이브러리 모달 표시 여부 */
  showVideoLibrary: boolean;
  /** 사운드 라이브러리 모달 표시 여부 */
  showSoundLibrary: boolean;
  /** 텍스트 에디터 모달 표시 여부 */
  showTextEditor: boolean;
  /** 일반 라이브러리 모달 표시 여부 */
  showLibrary: boolean;
  /** 비디오 라이브러리 모달 상태 설정 함수 */
  setShowVideoLibrary: React.Dispatch<React.SetStateAction<boolean>>;
  /** 사운드 라이브러리 모달 상태 설정 함수 */
  setShowSoundLibrary: React.Dispatch<React.SetStateAction<boolean>>;
  /** 텍스트 에디터 모달 상태 설정 함수 */
  setShowTextEditor: React.Dispatch<React.SetStateAction<boolean>>;
  /** 일반 라이브러리 모달 상태 설정 함수 */
  setShowLibrary: React.Dispatch<React.SetStateAction<boolean>>;
  
  // 모달 열기 핸들러
  /** 비디오 클립 추가 버튼 클릭 핸들러 (비디오 라이브러리 모달 열기) */
  handleAddClip: () => void;
  /** 사운드 클립 추가 버튼 클릭 핸들러 (사운드 라이브러리 모달 열기) */
  handleAddSound: () => void;
  /** 텍스트 클립 추가 버튼 클릭 핸들러 (텍스트 에디터 모달 열기) */
  handleAddText: () => void;
  
  // 컨테이너 ref
  /** 에디터 메인 컨테이너의 DOM 참조 */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

/**
 * 프로젝트 관리를 담당하는 Context Provider
 * 
 * 이 Provider는 Video Editor의 프로젝트 메타데이터, UI 레이아웃, 모달 상태 등
 * 편집 내용 외의 모든 상태를 관리합니다. ClipContext와 독립적으로 동작하며,
 * URL 파라미터를 통한 프로젝트 로드, 자동 저장 상태 추적 등을 제공합니다.
 * 
 * **관리하는 상태:**
 * - 프로젝트 메타데이터: 제목, 로드 상태, 저장 상태
 * - UI 레이아웃: 타임라인 높이, 리사이징 상태
 * - 모달 관리: 비디오/사운드/텍스트 라이브러리, 에디터 모달
 * - DOM 참조: 메인 컨테이너 ref
 * 
 * **제공하는 기능:**
 * - 프로젝트 로드: URL 파라미터나 직접 호출로 프로젝트 데이터 복원
 * - 수동 저장: 저장 상태 및 진행률 표시
 * - UI 제어: 타임라인 높이 조절, 모달 열기/닫기
 * - 이벤트 기반 통신: CustomEvent로 ClipContext와 데이터 교환
 * 
 * **의존성:**
 * - Next.js useSearchParams: URL 파라미터에서 프로젝트 정보 읽기
 * - API 함수: loadProject()로 서버에서 프로젝트 데이터 로드
 * - ClipContext: 'projectDataLoaded' 이벤트로 클립 데이터 전달
 * 
 * @param {Object} props - Provider 속성
 * @param {ReactNode} props.children - 하위 컴포넌트들
 * @returns {React.ReactElement} Context Provider 컴포넌트
 * 
 * @example
 * ```tsx
 * // 기본 사용법
 * function VideoEditor() {
 *   return (
 *     <ProjectProvider>
 *       <ClipProvider>
 *         <EditorInterface />
 *       </ClipProvider>
 *     </ProjectProvider>
 *   );
 * }
 * 
 * // URL 파라미터로 프로젝트 로드
 * // /video-editor?projectName=MyProject&title=My%20Video
 * function ProjectLoader() {
 *   const { isLoadingProject, projectLoadError, projectTitle } = useProject();
 *   
 *   if (isLoadingProject) return <div>Loading project...</div>;
 *   if (projectLoadError) return <div>Error: {projectLoadError}</div>;
 *   
 *   return <div>Editing: {projectTitle}</div>;
 * }
 * ```
 */
export function ProjectProvider({ children }: { children: ReactNode }) {
  // 프로젝트 메타데이터
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('Untitled Project');
  const searchParams = useSearchParams();
  const router = useRouter();
  
  
  // 프로젝트 로드 상태
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [projectLoadError, setProjectLoadError] = useState<string | null>(null);
  const [projectLoaded, setProjectLoaded] = useState(false);
  
  // 저장 상태
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // 타임라인 높이 관리 (page.tsx에서 그대로)
  const maxTimelineHeight = 400;
  const [timelineHeight, setTimelineHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [initialHeight, setInitialHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 동적 최소 타임라인 높이 계산을 위한 사운드 레인 추적
  const [soundLanes, setSoundLanes] = useState<number[]>([0]);
  
  // 모달 상태 (page.tsx에서 그대로)
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);
  const [showSoundLibrary, setShowSoundLibrary] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  
  // 사운드 레인 수에 따른 최소 타임라인 높이 계산
  const calculateMinTimelineHeight = useCallback((lanes: number[]) => {
    const videoTrackHeight = 32; // h-8 (32px)
    const textTrackHeight = 32;  // h-8 (32px)
    const soundLaneHeight = 48;  // h-12 (48px) per lane
    const addSoundLaneButtonHeight = 48; // h-12 (48px)
    const padding = 20; // 여유 공간
    
    const totalSoundHeight = lanes.length * soundLaneHeight + addSoundLaneButtonHeight;
    const minHeight = videoTrackHeight + textTrackHeight + totalSoundHeight + padding;
    
    return Math.max(minHeight, 140); // 최소 140px 보장
  }, []);
  
  // 프로젝트 데이터 로드 함수
  const loadProjectData = useCallback(async (projectNameOrId: string, isId: boolean = false) => {
    setIsLoadingProject(true);
    setProjectLoadError(null);
    
    // 기존 프로젝트 상태 초기화
    setProjectId(null);
    setProjectTitle('Loading...');
    
    try {
      const project = await loadProject(projectNameOrId, isId);
      
      // 프로젝트 메타데이터 설정
      console.log('[ProjectContext] 프로젝트 로드 완료:', { 
        id: project.id, 
        name: project.project_name 
      });
      
      setProjectId(project.id);
      setProjectTitle(project.project_name);
      
      // ClipContext에서 데이터 복원을 위해 이벤트 발생
      // (ClipContext에서 이 이벤트를 리스닝하여 처리)
      const event = new CustomEvent('projectDataLoaded', {
        detail: project.content_snapshot
      });
      window.dispatchEvent(event);
      
      setProjectLoaded(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load project';
      setProjectLoadError(errorMessage);
      console.error('[ProjectContext] 프로젝트 로드 실패:', errorMessage);
    } finally {
      setIsLoadingProject(false);
    }
  }, []);

  // 새 프로젝트 생성 및 URL 업데이트
  const createNewProjectAndRedirect = useCallback(async () => {
    if (isLoadingProject) return; // 이미 로딩 중이면 중복 실행 방지
    
    setIsLoadingProject(true);
    setProjectLoadError(null);
    
    try {
      const result = await createNewProject('Untitled Project');
      
      if (result.success && result.projectId) {
        // 프로젝트 생성 성공
        setProjectId(result.projectId);
        setProjectTitle('Untitled Project');
        setProjectLoaded(true);
        
        // URL을 단축 ID로 업데이트
        const shortId = getShortId(result.projectId);
        router.replace(`/video-editor?project=${shortId}`, { scroll: false });
      } else {
        throw new Error(result.error || 'Failed to create project');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project';
      setProjectLoadError(errorMessage);
    } finally {
      setIsLoadingProject(false);
    }
  }, [isLoadingProject, router]);
  
  // URL 파라미터에서 프로젝트 로드
  useEffect(() => {
    const title = searchParams.get('title');
    const projectName = searchParams.get('projectName');
    const projectIdParam = searchParams.get('projectId');
    const projectParam = searchParams.get('project'); // 새로운 단축 ID 파라미터
    
    // project 파라미터가 있을 때 처리 (8자리 단축 ID)
    if (projectParam) {
      const shortId = decodeURIComponent(projectParam);
      const currentShortId = projectId ? getShortId(projectId) : null;
      
      // 현재 projectId와 다르면 새 프로젝트 로드
      if (currentShortId !== shortId && !isLoadingProject) {
        console.log('[ProjectContext] 다른 프로젝트 감지, 새로 로드:', shortId);
        setProjectLoaded(false); // 상태 리셋
        loadProjectData(shortId, true);
      }
    }
    // projectId 파라미터가 있을 때 처리 (전체 UUID)
    else if (projectIdParam) {
      const fullId = decodeURIComponent(projectIdParam);
      if (projectId !== fullId && !isLoadingProject) {
        setProjectLoaded(false);
        loadProjectData(fullId, true);
      }
    }
    // projectName 파라미터가 있을 때 처리
    else if (projectName && !projectLoaded && !isLoadingProject) {
      loadProjectData(decodeURIComponent(projectName), false);
    }
    // title 파라미터만 있을 때 (이전 방식 호환)
    else if (title && !projectName && !projectIdParam && !projectParam) {
      setProjectTitle(decodeURIComponent(title));
    }
    // 아무 프로젝트 파라미터가 없고 아직 로드하지 않았다면 새 프로젝트 생성
    else if (!title && !projectName && !projectIdParam && !projectParam && !projectLoaded && !isLoadingProject) {
      createNewProjectAndRedirect();
    }
  }, [searchParams, projectId, isLoadingProject, loadProjectData, createNewProjectAndRedirect, projectLoaded]);
  
  // ClipContext에서 사운드 레인 변경 이벤트 수신
  useEffect(() => {
    const handleSoundLanesUpdate = (event: CustomEvent) => {
      const { soundLanes: newSoundLanes } = event.detail;
      setSoundLanes(newSoundLanes);
    };
    
    window.addEventListener('soundLanesUpdated', handleSoundLanesUpdate as EventListener);
    
    return () => {
      window.removeEventListener('soundLanesUpdated', handleSoundLanesUpdate as EventListener);
    };
  }, []);
  
  // 사운드 레인 수 변경 시 타임라인 높이 자동 조정
  useEffect(() => {
    const minHeight = calculateMinTimelineHeight(soundLanes);
    
    // 현재 높이가 최소 높이보다 작으면 자동으로 조정
    if (timelineHeight < minHeight) {
      setTimelineHeight(minHeight);
    }
  }, [soundLanes, calculateMinTimelineHeight, timelineHeight]);
  
  // 모달 열기 핸들러 (page.tsx에서 그대로)
  const handleAddClip = useCallback(() => {
    setShowVideoLibrary(true);
  }, []);
  
  const handleAddSound = useCallback(() => {
    setShowSoundLibrary(true);
  }, []);
  
  const handleAddText = useCallback(() => {
    setShowTextEditor(true);
  }, []);
  
  // 리사이저 드래그 핸들러 (page.tsx에서 그대로)
  const handleResizerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setDragStartY(e.clientY);
    setInitialHeight(timelineHeight);
  }, [timelineHeight]);
  
  // 리사이징 이벤트 핸들러 (page.tsx에서 그대로)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // 드래그 시작점 대비 상대적 변화량 계산 (위로 드래그하면 음수)
      const deltaY = dragStartY - e.clientY;
      const newHeight = initialHeight + deltaY;
      
      // 동적 최소 높이 계산 및 최대 높이 적용
      const minHeight = calculateMinTimelineHeight(soundLanes);
      const maxHeight = maxTimelineHeight;
      
      setTimelineHeight(Math.min(maxHeight, Math.max(minHeight, newHeight)));
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
      };
    }
  }, [isResizing, dragStartY, initialHeight, maxTimelineHeight, calculateMinTimelineHeight, soundLanes]);
  
  // Context value를 useMemo로 최적화 - 의존성 배열 단순화
  const value = useMemo(() => ({
    // 프로젝트 메타데이터
    projectId,
    setProjectId,
    projectTitle,
    setProjectTitle,
    
    // 프로젝트 로드 상태
    isLoadingProject,
    projectLoadError,
    loadProjectData,
    
    // 저장 상태
    saveStatus,
    setSaveStatus,
    saveError,
    setSaveError,
    
    // 타임라인 UI 상태
    timelineHeight,
    isResizing,
    dragStartY,
    initialHeight,
    maxTimelineHeight,
    
    // 타임라인 리사이징 함수
    handleResizerMouseDown,
    setTimelineHeight,
    
    // 모달 상태
    showVideoLibrary,
    showSoundLibrary,
    showTextEditor,
    showLibrary,
    setShowVideoLibrary,
    setShowSoundLibrary,
    setShowTextEditor,
    setShowLibrary,
    
    // 모달 열기 핸들러
    handleAddClip,
    handleAddSound,
    handleAddText,
    
    // 컨테이너 ref
    containerRef,
  }), [
    // 자주 변경되는 상태만 포함
    projectId,
    projectTitle,
    isLoadingProject,
    projectLoadError,
    saveStatus,
    saveError,
    timelineHeight,
    isResizing,
    dragStartY,
    initialHeight,
    showVideoLibrary,
    showSoundLibrary,
    showTextEditor,
    showLibrary,
    // 함수들은 useCallback으로 이미 안정화되어 있으므로 제외 가능
    loadProjectData,
    handleResizerMouseDown,
    handleAddClip,
    handleAddSound,
    handleAddText,
  ]);
  
  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

/**
 * 프로젝트 관리 Context를 사용하는 훅
 * 
 * 이 훅을 통해 프로젝트 메타데이터, UI 상태, 모달 관리 등에 접근할 수 있습니다.
 * ProjectProvider 내부에서만 사용 가능하며, ClipContext와 독립적으로 동작합니다.
 * 
 * **제공하는 기능:**
 * - 프로젝트 정보: projectTitle, isLoadingProject, projectLoadError
 * - 저장 상태: saveStatus, saveError
 * - UI 제어: timelineHeight, 리사이징 관련 상태/함수
 * - 모달 관리: 각종 라이브러리/에디터 모달 상태/함수
 * - DOM 참조: containerRef
 * 
 * **주요 사용 사례:**
 * - 프로젝트 제목 표시/수정
 * - 저장 상태 표시 (저장 중, 완료, 에러)
 * - 타임라인 높이 조절 UI
 * - 모달 열기/닫기 (비디오, 사운드, 텍스트 추가)
 * - 프로젝트 로드 상태 처리
 * 
 * @returns {ProjectContextType} 프로젝트 관리 상태와 함수들
 * @throws {Error} ProjectProvider 없이 사용할 경우 에러 발생
 * 
 * @example
 * ```tsx
 * function ProjectHeader() {
 *   const { 
 *     projectTitle, 
 *     setProjectTitle, 
 *     saveStatus,
 *     isLoadingProject 
 *   } = useProject();
 *   
 *   const getStatusText = () => {
 *     switch (saveStatus) {
 *       case 'saving': return '저장 중...';
 *       case 'saved': return '저장됨';
 *       case 'error': return '저장 실패';
 *       default: return '';
 *     }
 *   };
 *   
 *   if (isLoadingProject) {
 *     return <div>프로젝트 로딩 중...</div>;
 *   }
 *   
 *   return (
 *     <div>
 *       <input 
 *         value={projectTitle}
 *         onChange={(e) => setProjectTitle(e.target.value)}
 *         placeholder="프로젝트 제목 입력"
 *       />
 *       <span>{getStatusText()}</span>
 *     </div>
 *   );
 * }
 * 
 * function TimelineResizer() {
 *   const { 
 *     timelineHeight, 
 *     handleResizerMouseDown, 
 *     isResizing 
 *   } = useProject();
 *   
 *   return (
 *     <div 
 *       onMouseDown={handleResizerMouseDown}
 *       style={{ 
 *         cursor: isResizing ? 'ns-resize' : 'ns-resize',
 *         height: `${timelineHeight}px`
 *       }}
 *     >
 *       타임라인 리사이저
 *     </div>
 *   );
 * }
 * ```
 */
export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
}