'use client';

import { ReactNode } from 'react';
import { ClipProvider } from './ClipContext';
import { PlaybackProvider } from './PlaybackContext';
import { HistoryProvider } from './HistoryContext';
import { ProjectProvider } from './ProjectContext';

interface VideoEditorProvidersProps {
  children: ReactNode;
}

// Bridge 컴포넌트: ClipProvider와 HistoryProvider를 연결
function ClipWithHistoryProvider({ children }: { children: ReactNode }) {
  // 나중에 HistoryContext와 연결할 때 사용
  // const handleHistoryChange = useCallback(() => {
  //   // History save logic will be connected here
  // }, []);
  
  return (
    <ClipProvider>
      <HistoryProvider>
        <PlaybackProvider>
          {children}
        </PlaybackProvider>
      </HistoryProvider>
    </ClipProvider>
  );
}

/**
 * 모든 Video Editor Context를 통합하는 Provider
 * 순서가 중요: 의존성에 따라 배치
 */
export function VideoEditorProviders({ children }: VideoEditorProvidersProps) {
  return (
    <ProjectProvider>
      <ClipWithHistoryProvider>
        {children}
      </ClipWithHistoryProvider>
    </ProjectProvider>
  );
}

// Context export for convenience
export { useClips } from './ClipContext';
export { usePlayback } from './PlaybackContext';
export { useHistory } from './HistoryContext';
export { useProject } from './ProjectContext';