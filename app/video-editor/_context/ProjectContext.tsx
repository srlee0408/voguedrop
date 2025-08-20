'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { loadProject, saveProject } from '@/lib/api/projects';
import type { AutoSaveStatus } from '../_hooks/useAutoSave';

interface ProjectContextType {
  // 프로젝트 메타데이터
  projectTitle: string;
  setProjectTitle: React.Dispatch<React.SetStateAction<string>>;
  
  // 프로젝트 로드 상태
  isLoadingProject: boolean;
  projectLoadError: string | null;
  loadProjectData: (projectName: string) => Promise<void>;
  
  // 자동 저장 상태
  autoSaveStatus: AutoSaveStatus;
  setAutoSaveStatus: React.Dispatch<React.SetStateAction<AutoSaveStatus>>;
  lastAutoSavedAt: Date | null;
  setLastAutoSavedAt: React.Dispatch<React.SetStateAction<Date | null>>;
  autoSaveError: string | null;
  setAutoSaveError: React.Dispatch<React.SetStateAction<string | null>>;
  
  // 타임라인 UI 상태
  timelineHeight: number;
  isResizing: boolean;
  dragStartY: number;
  initialHeight: number;
  maxTimelineHeight: number;
  
  // 타임라인 리사이징 함수
  handleResizerMouseDown: (e: React.MouseEvent) => void;
  setTimelineHeight: React.Dispatch<React.SetStateAction<number>>;
  
  // 모달 상태
  showVideoLibrary: boolean;
  showSoundLibrary: boolean;
  showTextEditor: boolean;
  showLibrary: boolean;
  setShowVideoLibrary: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSoundLibrary: React.Dispatch<React.SetStateAction<boolean>>;
  setShowTextEditor: React.Dispatch<React.SetStateAction<boolean>>;
  setShowLibrary: React.Dispatch<React.SetStateAction<boolean>>;
  
  // 모달 열기 핸들러
  handleAddClip: () => void;
  handleAddSound: () => void;
  handleAddText: () => void;
  
  // 컨테이너 ref
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  // 프로젝트 제목 (page.tsx에서 그대로)
  const [projectTitle, setProjectTitle] = useState('Untitled Project');
  const searchParams = useSearchParams();
  
  // 프로젝트 로드 상태
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [projectLoadError, setProjectLoadError] = useState<string | null>(null);
  const [projectLoaded, setProjectLoaded] = useState(false);
  
  // 자동 저장 상태
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  
  // 타임라인 높이 관리 (page.tsx에서 그대로)
  const maxTimelineHeight = 240;
  const [timelineHeight, setTimelineHeight] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [initialHeight, setInitialHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 모달 상태 (page.tsx에서 그대로)
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);
  const [showSoundLibrary, setShowSoundLibrary] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  
  // 프로젝트 데이터 로드 함수
  const loadProjectData = useCallback(async (projectName: string) => {
    setIsLoadingProject(true);
    setProjectLoadError(null);
    
    try {
      const project = await loadProject(projectName);
      
      // 프로젝트 제목 설정
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
    } finally {
      setIsLoadingProject(false);
    }
  }, []);
  
  // URL 파라미터에서 프로젝트 로드
  useEffect(() => {
    const title = searchParams.get('title');
    const projectName = searchParams.get('projectName');
    
    // projectName 파라미터가 있고 아직 로드하지 않았다면
    if (projectName && !projectLoaded && !isLoadingProject) {
      loadProjectData(decodeURIComponent(projectName));
    }
    // title 파라미터만 있다면 (이전 방식 호환) - 새 프로젝트 생성
    else if (title && !projectName) {
      const newTitle = decodeURIComponent(title);
      setProjectTitle(newTitle);
      
      // 새 프로젝트를 자동으로 DB에 저장 (빈 프로젝트로)
      saveProject({
        projectName: newTitle,
        videoClips: [],
        textClips: [],
        soundClips: [],
        aspectRatio: '9:16',
        durationInFrames: 0
      }).then(result => {
        if (result.success) {
          console.log('New project created and saved:', newTitle);
        }
      });
    }
    // 아무 파라미터도 없으면 기본 Untitled Project로 생성
    else if (!title && !projectName && !projectLoaded && !isLoadingProject) {
      // Untitled Project도 자동 저장
      const defaultTitle = 'Untitled Project';
      saveProject({
        projectName: defaultTitle,
        videoClips: [],
        textClips: [],
        soundClips: [],
        aspectRatio: '9:16',
        durationInFrames: 0
      }).then(result => {
        if (result.success) {
          console.log('Default project created and saved:', defaultTitle);
        }
      });
    }
  }, [searchParams, projectLoaded, isLoadingProject, loadProjectData]);
  
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
      
      // 최소 100px, 최대 300px
      const minHeight = 100;
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
  }, [isResizing, dragStartY, initialHeight, maxTimelineHeight]);
  
  // Context value를 useMemo로 최적화
  const value = useMemo(() => ({
    // 프로젝트 메타데이터
    projectTitle,
    setProjectTitle,
    
    // 프로젝트 로드 상태
    isLoadingProject,
    projectLoadError,
    loadProjectData,
    
    // 자동 저장 상태
    autoSaveStatus,
    setAutoSaveStatus,
    lastAutoSavedAt,
    setLastAutoSavedAt,
    autoSaveError,
    setAutoSaveError,
    
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
    projectTitle,
    isLoadingProject,
    projectLoadError,
    loadProjectData,
    autoSaveStatus,
    lastAutoSavedAt,
    autoSaveError,
    timelineHeight,
    isResizing,
    dragStartY,
    initialHeight,
    maxTimelineHeight,
    handleResizerMouseDown,
    showVideoLibrary,
    showSoundLibrary,
    showTextEditor,
    showLibrary,
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

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
}