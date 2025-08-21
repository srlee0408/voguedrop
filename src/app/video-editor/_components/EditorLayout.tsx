'use client';

import { ReactNode } from 'react';
import { Header } from '@/shared/components/layout/Header';
import { useProject } from '../_context/Providers';
import type { SaveStatus } from '../_hooks/useManualSave';

interface EditorLayoutProps {
  previewSection: ReactNode;
  timelineSection: ReactNode;
  projectTitle: string;
  onProjectTitleChange: (title: string) => void;
  onLibraryClick: () => void;
  saveStatus: SaveStatus;
  saveError: string | null;
  onSaveProject?: () => void;
}

export default function EditorLayout({
  previewSection,
  timelineSection,
  projectTitle,
  onProjectTitleChange,
  onLibraryClick,
  saveStatus,
  saveError,
  onSaveProject,
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
        saveStatus={saveStatus}
        saveError={saveError}
        onSaveProject={onSaveProject}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Preview Section - 상단 영역 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {previewSection}
        </div>

        {/* 리사이저 바 - PreviewSection과 TimelineSection 사이 */}
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

        {/* Timeline Section - 하단 영역 */}
        <div className="flex-shrink-0">
          {timelineSection}
        </div>
      </div>
    </div>
  );
}