'use client';

import { ReactNode } from 'react';
import { Header } from '@/shared/components/layout/Header';
import { useProject } from '../_context/Providers';
import type { AutoSaveStatus } from '../_hooks/useAutoSave';

interface EditorLayoutProps {
  children: ReactNode;
  projectTitle: string;
  onProjectTitleChange: (title: string) => void;
  onLibraryClick: () => void;
  autoSaveStatus: AutoSaveStatus;
  autoSaveError: string | null;
}

export default function EditorLayout({
  children,
  projectTitle,
  onProjectTitleChange,
  onLibraryClick,
  autoSaveStatus,
  autoSaveError,
}: EditorLayoutProps) {
  const {
    timelineHeight,
    isResizing,
    handleResizerMouseDown,
    containerRef,
  } = useProject();

  return (
    <div ref={containerRef} className="bg-background text-foreground h-screen overflow-hidden flex flex-col">
      <Header 
        activePage="edit"
        projectTitle={projectTitle}
        onProjectTitleChange={onProjectTitleChange}
        onLibraryClick={onLibraryClick}
        autoSaveStatus={autoSaveStatus}
        autoSaveError={autoSaveError}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}

        {/* 리사이저 바 - 아래로만 드래그 가능 */}
        <div 
          className={`h-1 bg-gray-700 hover:bg-[#38f47cf9] transition-colors relative ${
            isResizing ? 'bg-[#38f47cf9]' : ''
          } ${timelineHeight >= 300 ? 'cursor-s-resize' : 'cursor-ns-resize'}`}
          onMouseDown={handleResizerMouseDown}
          title={timelineHeight >= 300 ? "드래그하여 타임라인 축소" : "드래그하여 타임라인 크기 조정"}
        >
          {/* 리사이저 핸들 아이콘 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col gap-0.5">
              <div className="w-8 h-0.5 bg-gray-500 rounded-full" />
              <div className="w-8 h-0.5 bg-gray-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}