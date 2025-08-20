'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';
import { useClips } from './ClipContext';

// 히스토리 상태 타입 (page.tsx에서 그대로)
interface HistoryState {
  timelineClips: VideoClip[];
  textClips: TextClip[];
  soundClips: SoundClip[];
}

interface HistoryContextType {
  // 히스토리 상태
  history: HistoryState[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  
  // 히스토리 액션
  saveToHistory: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

const MAX_HISTORY_SIZE = 50;

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

export function useHistory() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within HistoryProvider');
  }
  return context;
}