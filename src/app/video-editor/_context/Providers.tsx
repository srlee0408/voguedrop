'use client';

import { ReactNode, useEffect } from 'react';
import { ClipProvider } from './ClipContext';
import { PlaybackProvider } from './PlaybackContext';
import { HistoryProvider } from './HistoryContext';
import { ProjectProvider } from './ProjectContext';
import { useClips as useClipsContext } from './ClipContext';
import { useHistory as useHistoryContext } from './HistoryContext';

interface VideoEditorProvidersProps {
  children: ReactNode;
}

// ClipProvider와 HistoryProvider를 연결하는 중간 컴포넌트
function HistoryConnector({ children }: { children: ReactNode }) {
  const { saveToHistory } = useHistoryContext();
  const { setSaveToHistoryCallback } = useClipsContext();
  
  // ClipContext에 saveToHistory 콜백 연결
  useEffect(() => {
    if (setSaveToHistoryCallback) {
      setSaveToHistoryCallback(() => saveToHistory);
    }
  }, [saveToHistory, setSaveToHistoryCallback]);
  
  // 초기 히스토리 저장 (최초 1회)
  useEffect(() => {
    // 컴포넌트 마운트 시 현재 상태를 초기 히스토리로 저장
    saveToHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  return <>{children}</>;
}

/**
 * 모든 Video Editor Context를 통합하는 Provider
 * ClipProvider가 자체 상태를 관리하고, HistoryProvider가 이를 사용
 */
export function VideoEditorProviders({ children }: VideoEditorProvidersProps) {
  return (
    <ProjectProvider>
      <ClipProvider>
        <HistoryProvider>
          <PlaybackProvider>
            <HistoryConnector>
              {children}
            </HistoryConnector>
          </PlaybackProvider>
        </HistoryProvider>
      </ClipProvider>
    </ProjectProvider>
  );
}

// Context export for convenience
export { useClips } from './ClipContext';
export { usePlayback } from './PlaybackContext';
export { useHistory } from './HistoryContext';
export { useProject } from './ProjectContext';