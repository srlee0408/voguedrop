'use client';

import { ReactNode, useEffect } from 'react';
import { ClipProvider } from './ClipContext';
import { PlaybackProvider } from './PlaybackContext';
import { HistoryProvider } from './HistoryContext';
import { ProjectProvider } from './ProjectContext';
import { useClips as useClipsContext } from './ClipContext';
import { useHistory as useHistoryContext } from './HistoryContext';

/**
 * VideoEditorProviders 컴포넌트의 Props
 * @interface VideoEditorProvidersProps
 */
interface VideoEditorProvidersProps {
  /** 하위 컴포넌트들 */
  children: ReactNode;
}

/**
 * ClipProvider와 HistoryProvider를 연결하는 중간 컴포넌트
 * 
 * 이 컴포넌트는 ClipContext와 HistoryContext 간의 의존성을 해결합니다.
 * ClipContext에서 상태 변경 시 HistoryContext의 saveToHistory 함수를 호출하도록
 * 콜백을 연결하고, 초기 히스토리 저장을 수행합니다.
 * 
 * **연결 과정:**
 * 1. HistoryContext에서 saveToHistory 함수 가져오기
 * 2. ClipContext에 saveToHistory 콜백 함수 등록
 * 3. 컴포넌트 마운트 시 초기 상태를 히스토리에 저장
 * 
 * @param {Object} props - 컴포넌트 속성
 * @param {ReactNode} props.children - 하위 컴포넌트들
 * @returns {React.ReactElement} 연결된 하위 컴포넌트들
 */
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
 * 모든 Video Editor Context를 통합하는 최상위 Provider
 * 
 * 이 Provider는 Video Editor에 필요한 모든 Context를 올바른 계층 구조로 조합하여
 * 하위 컴포넌트들이 모든 상태와 기능에 접근할 수 있도록 합니다.
 * 각 Context 간의 의존성을 고려하여 적절한 순서로 배치했습니다.
 * 
 * **Provider 계층 구조:**
 * ```
 * ProjectProvider (프로젝트 메타데이터, UI 상태)
 *   └── ClipProvider (클립 관리, 편집 상태)
 *       └── HistoryProvider (실행 취소/다시 실행)
 *           └── PlaybackProvider (재생 제어)
 *               └── HistoryConnector (Context 간 연결)
 * ```
 * 
 * **계층 순서 이유:**
 * 1. **ProjectProvider**: 독립적, 다른 Context에 의존하지 않음
 * 2. **ClipProvider**: ProjectProvider의 이벤트를 수신하여 프로젝트 데이터 복원
 * 3. **HistoryProvider**: ClipProvider의 상태를 참조하여 히스토리 관리
 * 4. **PlaybackProvider**: ClipProvider의 클립 정보를 참조하여 재생 시간 계산
 * 5. **HistoryConnector**: ClipProvider와 HistoryProvider를 연결
 * 
 * **Context 간 상호작용:**
 * - ProjectProvider → ClipProvider: 'projectDataLoaded' CustomEvent로 데이터 전달
 * - ClipProvider → HistoryProvider: saveToHistory 콜백으로 히스토리 저장 요청
 * - ClipProvider → PlaybackProvider: 클립 배열을 읽어서 총 재생 시간 계산
 * - 모든 Context: 독립적인 상태 관리, 필요 시에만 다른 Context 참조
 * 
 * @param {VideoEditorProvidersProps} props - Provider 속성
 * @param {ReactNode} props.children - Video Editor의 모든 하위 컴포넌트들
 * @returns {React.ReactElement} 통합된 Context Provider 트리
 * 
 * @example
 * ```tsx
 * // page.tsx에서 사용
 * export default function VideoEditorPage() {
 *   return (
 *     <VideoEditorProviders>
 *       <VideoEditorClient />
 *     </VideoEditorProviders>
 *   );
 * }
 * 
 * // 하위 컴포넌트에서 모든 Context 사용 가능
 * function EditorComponent() {
 *   const { projectTitle } = useProject();
 *   const { timelineClips, handleAddToTimeline } = useClips();
 *   const { isPlaying, handlePlayPause } = usePlayback();
 *   const { canUndo, handleUndo } = useHistory();
 *   
 *   return (
 *     <div>
 *       <h1>{projectTitle}</h1>
 *       <button onClick={handlePlayPause}>
 *         {isPlaying ? 'Pause' : 'Play'}
 *       </button>
 *       <button onClick={handleUndo} disabled={!canUndo}>
 *         Undo
 *       </button>
 *       {timelineClips.map(clip => (
 *         <ClipComponent key={clip.id} clip={clip} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
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