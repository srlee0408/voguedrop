'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

interface ProjectContextType {
  // 프로젝트 메타데이터
  projectTitle: string;
  setProjectTitle: React.Dispatch<React.SetStateAction<string>>;
  
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
  
  // URL 파라미터에서 프로젝트 제목 읽기 (page.tsx에서 그대로)
  useEffect(() => {
    const title = searchParams.get('title');
    if (title) {
      setProjectTitle(decodeURIComponent(title));
    }
  }, [searchParams]);
  
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