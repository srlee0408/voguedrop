'use client';

import { createContext, useContext, useState, useCallback, useRef, useMemo, ReactNode, useEffect } from 'react';
import { PlayerRef } from '@remotion/player';
import { useClips } from './ClipContext';
import { calculateTimelineDuration } from '../_utils/timeline-helpers';

interface PlaybackContextType {
  // 재생 상태
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  playerRef: React.MutableRefObject<PlayerRef | null>;
  prevFrameRef: React.MutableRefObject<number>;
  
  // 재생 제어 함수
  handlePlayPause: () => void;
  handleSeek: (time: number) => void;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

const PIXELS_PER_SECOND = 40;

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

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within PlaybackProvider');
  }
  return context;
}