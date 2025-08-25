'use client';

import { createContext, useContext, useState, useCallback, useRef, useMemo, ReactNode, useEffect } from 'react';
import { PlayerRef } from '@remotion/player';
import { useClips } from './ClipContext';
import { calculateTimelineDuration } from '../_utils/common-clip-utils';

/**
 * 재생 제어 Context의 타입 정의
 * 
 * 이 Context는 Video Editor의 재생/일시정지, 시간 탐색 등
 * 모든 재생 관련 상태와 기능을 중앙 집중식으로 관리합니다.
 * Remotion Player와의 동기화를 담당하며, 프레임 단위의 정밀한 제어를 제공합니다.
 * 
 * @interface PlaybackContextType
 */
interface PlaybackContextType {
  // 재생 상태
  /** 현재 비디오가 재생 중인지 여부 */
  isPlaying: boolean;
  /** 현재 재생 시간 (초 단위) */
  currentTime: number;
  /** 전체 비디오 길이 (초 단위) - 모든 클립을 고려한 최대 길이 */
  totalDuration: number;
  /** Remotion Player 참조 객체 (play, pause, seekTo 제어용) */
  playerRef: React.MutableRefObject<PlayerRef | null>;
  /** 이전 프레임 번호 저장 (재생 완료 감지용) */
  prevFrameRef: React.MutableRefObject<number>;
  
  // 재생 제어 함수
  /** 재생/일시정지 토글 함수 (끝에서 재생 시 처음부터 시작) */
  handlePlayPause: () => void;
  /** 특정 시간으로 이동하는 함수 (프레임 단위 정밀 제어) */
  handleSeek: (time: number) => void;
  /** 재생 상태 설정 함수 */
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  /** 현재 시간 설정 함수 */
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

/** 타임라인 스케일: 1초당 픽셀 수 (40px = 1초) */
const PIXELS_PER_SECOND = 40;

/**
 * 재생 제어를 담당하는 Context Provider
 * 
 * 이 Provider는 Video Editor의 재생/일시정지, 시간 탐색, 진행률 추적 등
 * 모든 재생 관련 기능을 제공합니다. Remotion Player와 완전히 동기화되며,
 * 30fps 기준의 프레임 단위 정밀 제어를 지원합니다.
 * 
 * **관리하는 상태:**
 * - 재생 상태: isPlaying, currentTime, totalDuration
 * - Player 참조: Remotion Player 인스턴스 제어
 * - 프레임 추적: 이전 프레임 저장으로 재생 완료 감지
 * 
 * **제공하는 기능:**
 * - 재생 제어: 재생/일시정지, 시간 탐색 (seek)
 * - 자동 완료 감지: 재생 끝 도달 시 자동 정지
 * - 프레임 동기화: 중복 업데이트 방지 및 성능 최적화
 * - 상태 폴링: 100ms 간격으로 재생 상태 업데이트
 * 
 * **ClipContext 의존성:**
 * - 총 재생 시간은 모든 클립(비디오, 텍스트, 사운드)의 최대 끝 시간으로 계산
 * - 클립 변경 시 자동으로 totalDuration 재계산
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
 *       <PlaybackProvider>
 *         <VideoPreview />
 *         <PlayerControls />
 *       </PlaybackProvider>
 *     </ClipProvider>
 *   );
 * }
 * ```
 */
export function PlaybackProvider({ children }: { children: ReactNode }) {
  // 재생 상태 관리 (page.tsx에서 그대로)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const playerRef = useRef<PlayerRef | null>(null);
  const prevFrameRef = useRef<number>(0);
  // 마지막으로 seek한 프레임을 저장하여 중복 업데이트 방지
  const lastSeekFrameRef = useRef<number>(-1);
  
  // isPlaying을 ref로도 저장하여 useCallback 의존성 문제 해결
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  
  // ClipContext에서 클립 정보 가져오기
  const { timelineClips, textClips, soundClips } = useClips();
  
  // 재생/일시정지 토글 (page.tsx의 handlePlayPause 그대로)
  const handlePlayPause = useCallback(() => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        // 총 길이 계산
        const videoEnd = timelineClips.length > 0 
          ? Math.max(...timelineClips.map(c => (c.position || 0) + c.duration))
          : 0;
        const textEnd = textClips.length > 0
          ? Math.max(...textClips.map(c => (c.position || 0) + c.duration))
          : 0;
        const soundEnd = soundClips.length > 0
          ? Math.max(...soundClips.map(c => (c.position || 0) + c.duration))
          : 0;
        
        const totalPx = Math.max(videoEnd, textEnd, soundEnd);
        const totalSeconds = totalPx / PIXELS_PER_SECOND;
        
        // 현재 위치가 끝이면 처음부터 재생
        if (currentTime >= totalSeconds - 0.1) {
          playerRef.current.seekTo(0);
          setCurrentTime(0);
        }
        
        playerRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, currentTime, timelineClips, textClips, soundClips]);
  
  // Seek 함수 - 재생 중일 때도 재생 상태 유지
  const handleSeek = useCallback((time: number) => {
    // 음수 방지 및 프레임 단위로 중복 호출 차단
    const clampedTime = Math.max(0, time);
    const targetFrame = Math.round(clampedTime * 30); // 30fps 기준

    // 동일 프레임으로의 반복 seek는 무시 (무한 업데이트 방지)
    if (lastSeekFrameRef.current === targetFrame) {
      return;
    }
    lastSeekFrameRef.current = targetFrame;

    setCurrentTime(prev_time => {
      // 같은 프레임(≈1/30초) 이내 변화면 상태 업데이트 생략
      if (Math.abs(prev_time - clampedTime) < 1 / 30) {
        return prev_time;
      }
      return clampedTime;
    });

    if (playerRef.current) {
      playerRef.current.seekTo(targetFrame);

      // ref를 사용하여 현재 재생 상태 확인 (의존성 없이)
      if (isPlayingRef.current) {
        // seekTo 후 약간의 딜레이를 주고 재생
        setTimeout(() => {
          if (playerRef.current && isPlayingRef.current) {
            playerRef.current.play();
          }
        }, 10);
      }
    }
  }, []);
  
  // Player 상태 폴링으로 시간 업데이트 및 재생 완료 감지 (page.tsx에서 그대로)
  useEffect(() => {
    if (!isPlaying || !playerRef.current) {
      prevFrameRef.current = 0;
      return;
    }
    
    // 총 프레임 계산
    const videoEnd = timelineClips.length > 0 
      ? Math.max(...timelineClips.map(c => (c.position || 0) + c.duration))
      : 0;
    const textEnd = textClips.length > 0
      ? Math.max(...textClips.map(c => (c.position || 0) + c.duration))
      : 0;
    const soundEnd = soundClips.length > 0
      ? Math.max(...soundClips.map(c => (c.position || 0) + c.duration))
      : 0;
    
    const totalPx = Math.max(videoEnd, textEnd, soundEnd);
    const totalSeconds = totalPx / 40; // 40px = 1초
    const totalFrames = Math.max(30, Math.round(totalSeconds * 30)); // 30fps
    
    const interval = setInterval(() => {
      if (playerRef.current) {
        const frame = playerRef.current.getCurrentFrame();
        const time = frame / 30; // 30fps 기준
        
        // Player가 끝에서 자동으로 0으로 리셋된 경우 감지
        if (prevFrameRef.current > totalFrames - 5 && frame < 10) {
          setIsPlaying(false);
          setCurrentTime(totalSeconds); // 끝 위치에 유지
          if (playerRef.current) {
            playerRef.current.pause();
          }
          prevFrameRef.current = 0;
          return;
        }
        
        // 재생이 완전히 끝에 도달한 경우
        if (frame >= totalFrames - 1) {
          setIsPlaying(false);
          setCurrentTime(totalSeconds); // 끝 위치에 유지
          if (playerRef.current) {
            playerRef.current.pause();
          }
          prevFrameRef.current = 0;
          return;
        }
        
        // 정상 재생 중
        prevFrameRef.current = frame;
        setCurrentTime(time);
      }
    }, 100); // 100ms마다 업데이트
    
    return () => clearInterval(interval);
  }, [isPlaying, timelineClips, textClips, soundClips]);
  
  // 전체 Duration 계산
  useEffect(() => {
    const duration = calculateTimelineDuration(
      timelineClips,
      textClips,
      soundClips,
      PIXELS_PER_SECOND
    );
    setTotalDuration(duration);
  }, [timelineClips, textClips, soundClips]);
  
  // Context value를 useMemo로 최적화
  const value = useMemo(() => ({
    isPlaying,
    currentTime,
    totalDuration,
    playerRef,
    prevFrameRef,
    handlePlayPause,
    handleSeek,
    setIsPlaying,
    setCurrentTime,
  }), [isPlaying, currentTime, totalDuration, handlePlayPause, handleSeek]);
  
  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
}

/**
 * 재생 제어 Context를 사용하는 훅
 * 
 * 이 훅을 통해 비디오 재생/일시정지, 시간 탐색, 재생 상태 등에 접근할 수 있습니다.
 * PlaybackProvider 내부에서만 사용 가능하며, Remotion Player와 완전히 동기화됩니다.
 * 
 * **제공하는 기능:**
 * - 재생 상태: isPlaying, currentTime, totalDuration
 * - 재생 제어: handlePlayPause, handleSeek
 * - Player 참조: playerRef (직접 Remotion API 호출 시 사용)
 * - 프레임 추적: prevFrameRef (고급 제어 시 사용)
 * 
 * @returns {PlaybackContextType} 재생 제어 상태와 함수들
 * @throws {Error} PlaybackProvider 없이 사용할 경우 에러 발생
 * 
 * @example
 * ```tsx
 * function PlayerControls() {
 *   const { 
 *     isPlaying, 
 *     currentTime, 
 *     totalDuration, 
 *     handlePlayPause, 
 *     handleSeek 
 *   } = usePlayback();
 *   
 *   const formatTime = (seconds: number) => {
 *     const mins = Math.floor(seconds / 60);
 *     const secs = Math.floor(seconds % 60);
 *     return `${mins}:${secs.toString().padStart(2, '0')}`;
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={handlePlayPause}>
 *         {isPlaying ? 'Pause' : 'Play'}
 *       </button>
 *       <input 
 *         type="range"
 *         min={0}
 *         max={totalDuration}
 *         value={currentTime}
 *         onChange={(e) => handleSeek(Number(e.target.value))}
 *       />
 *       <span>{formatTime(currentTime)} / {formatTime(totalDuration)}</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within PlaybackProvider');
  }
  return context;
}