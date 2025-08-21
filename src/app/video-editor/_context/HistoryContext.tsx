'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';
import { useClips } from './ClipContext';

/**
 * 히스토리 상태 타입 정의
 * 
 * 실행 취소/다시 실행을 위해 저장되는 상태의 스냅샷입니다.
 * 모든 클립 타입을 포함하여 완전한 편집 상태를 보존합니다.
 * 
 * @interface HistoryState
 */
interface HistoryState {
  /** 비디오 클립 배열의 스냅샷 */
  timelineClips: VideoClip[];
  /** 텍스트 클립 배열의 스냅샷 */
  textClips: TextClip[];
  /** 사운드 클립 배열의 스냅샷 */
  soundClips: SoundClip[];
}

/**
 * 히스토리 관리 Context의 타입 정의
 * 
 * 이 Context는 Video Editor의 실행 취소(Undo)/다시 실행(Redo) 기능을 담당합니다.
 * 최대 50개의 히스토리를 유지하며, 상태 변경 시 자동으로 히스토리를 저장합니다.
 * 중복 상태는 저장하지 않아 메모리를 효율적으로 사용합니다.
 * 
 * @interface HistoryContextType
 */
interface HistoryContextType {
  // 히스토리 상태
  /** 저장된 모든 히스토리 상태 배열 (최대 50개) */
  history: HistoryState[];
  /** 현재 히스토리 위치 인덱스 (-1은 초기 상태) */
  historyIndex: number;
  /** 실행 취소가 가능한지 여부 (historyIndex > 0) */
  canUndo: boolean;
  /** 다시 실행이 가능한지 여부 (historyIndex < history.length - 1) */
  canRedo: boolean;
  
  // 히스토리 액션
  /** 현재 상태를 히스토리에 저장하는 함수 (중복 상태는 저장하지 않음) */
  saveToHistory: () => void;
  /** 이전 상태로 되돌리는 함수 (Ctrl+Z) */
  handleUndo: () => void;
  /** 다음 상태로 진행하는 함수 (Ctrl+Y) */
  handleRedo: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

/** 최대 히스토리 저장 개수 (메모리 사용량 제한) */
const MAX_HISTORY_SIZE = 50;

/**
 * 히스토리 관리를 담당하는 Context Provider
 * 
 * 이 Provider는 Video Editor의 실행 취소/다시 실행 기능을 제공합니다.
 * ClipContext와 연동하여 모든 클립 상태 변경을 추적하고, 
 * 사용자가 편집 작업을 되돌리거나 다시 실행할 수 있도록 합니다.
 * 
 * **관리하는 상태:**
 * - 히스토리 스택: 최대 50개의 상태 스냅샷 보관
 * - 현재 위치: 히스토리 스택에서의 현재 인덱스
 * - 가능 여부: Undo/Redo 가능 여부 계산
 * 
 * **제공하는 기능:**
 * - 상태 저장: 클립 변경 시 자동으로 히스토리에 저장
 * - 중복 방지: 동일한 상태는 저장하지 않아 메모리 절약
 * - 분기 처리: Undo 후 새 작업 시 미래 히스토리 제거
 * - 크기 제한: 최대 50개 초과 시 오래된 항목 자동 제거
 * 
 * **ClipContext 의존성:**
 * - ClipContext의 모든 상태(timelineClips, textClips, soundClips)를 참조
 * - 상태 복원 시 ClipContext의 setter 함수들을 호출
 * 
 * @param {Object} props - Provider 속성
 * @param {ReactNode} props.children - 하위 컴포넌트들
 * @returns {React.ReactElement} Context Provider 컴포넌트
 * 
 * @example
 * ```tsx
 * function VideoEditor() {
 *   return (
 *     <ClipProvider>
 *       <HistoryProvider>
 *         <EditorInterface />
 *         <UndoRedoButtons />
 *       </HistoryProvider>
 *     </ClipProvider>
 *   );
 * }
 * ```
 */
export function HistoryProvider({ children }: { children: ReactNode }) {
  // 히스토리 관리 (page.tsx에서 그대로)
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // ClipContext에서 클립 상태 가져오기
  const { 
    timelineClips, 
    textClips, 
    soundClips,
    setTimelineClips,
    setTextClips,
    setSoundClips,
  } = useClips();
  
  // 히스토리에 현재 상태 저장 (page.tsx의 saveToHistory 그대로)
  const saveToHistory = useCallback(() => {
    const newState: HistoryState = {
      timelineClips: [...timelineClips],
      textClips: [...textClips],
      soundClips: [...soundClips]
    };
    
    // 현재 인덱스가 히스토리 끝이 아닌 경우 (Undo 후 새 작업)
    // 현재 위치의 상태와 비교하여 다른 경우에만 저장
    if (historyIndex >= 0 && historyIndex < history.length) {
      const currentState = history[historyIndex];
      const isSameState = 
        JSON.stringify(currentState.timelineClips) === JSON.stringify(timelineClips) &&
        JSON.stringify(currentState.textClips) === JSON.stringify(textClips) &&
        JSON.stringify(currentState.soundClips) === JSON.stringify(soundClips);
      
      if (isSameState) {
        return; // 동일한 상태면 저장하지 않음
      }
    }
    
    // 현재 인덱스 이후의 히스토리 제거 (새로운 분기 생성)
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    // 최대 50개 히스토리 유지
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
  }, [history, historyIndex, timelineClips, textClips, soundClips]);
  
  // Undo 기능 (page.tsx의 handleUndo 그대로)
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setTimelineClips(previousState.timelineClips);
      setTextClips(previousState.textClips);
      setSoundClips(previousState.soundClips);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex, setTimelineClips, setTextClips, setSoundClips]);
  
  // Redo 기능 (page.tsx의 handleRedo 그대로)
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setTimelineClips(nextState.timelineClips);
      setTextClips(nextState.textClips);
      setSoundClips(nextState.soundClips);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex, setTimelineClips, setTextClips, setSoundClips]);
  
  // Undo/Redo 가능 여부
  const canUndo = useMemo(() => historyIndex > 0, [historyIndex]);
  const canRedo = useMemo(() => historyIndex < history.length - 1, [historyIndex, history.length]);
  
  // Context value를 useMemo로 최적화
  const value = useMemo(() => ({
    history,
    historyIndex,
    canUndo,
    canRedo,
    saveToHistory,
    handleUndo,
    handleRedo,
  }), [history, historyIndex, canUndo, canRedo, saveToHistory, handleUndo, handleRedo]);
  
  return (
    <HistoryContext.Provider value={value}>
      {children}
    </HistoryContext.Provider>
  );
}

/**
 * 히스토리 관리 Context를 사용하는 훅
 * 
 * 이 훅을 통해 실행 취소/다시 실행 기능과 히스토리 상태에 접근할 수 있습니다.
 * HistoryProvider 내부에서만 사용 가능하며, ClipContext와 자동으로 연동됩니다.
 * 
 * **제공하는 기능:**
 * - 히스토리 상태: history, historyIndex, canUndo, canRedo
 * - 히스토리 조작: saveToHistory, handleUndo, handleRedo
 * - 자동 연동: ClipContext 상태 변경 시 자동 저장
 * 
 * **사용 패턴:**
 * - saveToHistory(): 수동으로 히스토리 저장 (일반적으로 ClipContext에서 자동 호출)
 * - handleUndo(): 키보드 단축키 (Ctrl+Z)나 버튼 클릭으로 실행
 * - handleRedo(): 키보드 단축키 (Ctrl+Y)나 버튼 클릭으로 실행
 * 
 * @returns {HistoryContextType} 히스토리 관리 상태와 함수들
 * @throws {Error} HistoryProvider 없이 사용할 경우 에러 발생
 * 
 * @example
 * ```tsx
 * function UndoRedoButtons() {
 *   const { canUndo, canRedo, handleUndo, handleRedo } = useHistory();
 *   
 *   // 키보드 단축키 처리
 *   useEffect(() => {
 *     const handleKeyDown = (e: KeyboardEvent) => {
 *       if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
 *         e.preventDefault();
 *         if (canUndo) handleUndo();
 *       } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
 *         e.preventDefault();
 *         if (canRedo) handleRedo();
 *       }
 *     };
 *     
 *     window.addEventListener('keydown', handleKeyDown);
 *     return () => window.removeEventListener('keydown', handleKeyDown);
 *   }, [canUndo, canRedo, handleUndo, handleRedo]);
 *   
 *   return (
 *     <div>
 *       <button onClick={handleUndo} disabled={!canUndo}>
 *         Undo (Ctrl+Z)
 *       </button>
 *       <button onClick={handleRedo} disabled={!canRedo}>
 *         Redo (Ctrl+Y)
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useHistory() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within HistoryProvider');
  }
  return context;
}