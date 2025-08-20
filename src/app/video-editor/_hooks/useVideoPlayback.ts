import { useState, useEffect, useRef, useCallback } from 'react';
import { PlayerRef } from '@remotion/player';
import { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';
import { TIMELINE_CONFIG } from '../_constants';

interface UseVideoPlaybackProps {
  timelineClips: VideoClip[];
  textClips: TextClip[];
  soundClips: SoundClip[];
}

export function useVideoPlayback({ 
  timelineClips, 
  textClips, 
  soundClips 
}: UseVideoPlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<PlayerRef | null>(null);
  const prevFrameRef = useRef<number>(0);

  const handlePlayPause = useCallback(() => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    if (playerRef.current) {
      const frame = Math.round(time * TIMELINE_CONFIG.FPS);
      playerRef.current.seekTo(frame);
    }
  }, []);

  // Player 상태 폴링으로 시간 업데이트 및 재생 완료 감지
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
    const totalSeconds = totalPx / TIMELINE_CONFIG.PIXELS_PER_SECOND;
    const totalFrames = Math.max(30, Math.round(totalSeconds * TIMELINE_CONFIG.FPS));
    
    const interval = setInterval(() => {
      if (playerRef.current) {
        const frame = playerRef.current.getCurrentFrame();
        const time = frame / TIMELINE_CONFIG.FPS;
        
        // Player가 끝에서 자동으로 0으로 리셋된 경우 감지
        if (prevFrameRef.current > totalFrames * 0.9 && frame < 10) {
          setIsPlaying(false);
          setCurrentTime(0);
          if (playerRef.current) {
            playerRef.current.pause();
          }
          prevFrameRef.current = 0;
          return;
        }
        
        // 재생이 거의 끝에 도달한 경우 (95% 이상)
        if (frame >= totalFrames * 0.95) {
          setIsPlaying(false);
          setCurrentTime(0);
          if (playerRef.current) {
            playerRef.current.pause();
            playerRef.current.seekTo(0);
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

  return {
    isPlaying,
    currentTime,
    playerRef,
    handlePlayPause,
    handleSeek,
    setIsPlaying
  };
}