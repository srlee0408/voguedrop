import { useState, useEffect, useCallback, useRef } from 'react';
import type { PlayerRef } from '@remotion/player';

interface UseRemotionPlayerProps {
  playerRef: React.RefObject<PlayerRef | null>;
  isOpen: boolean;
  totalDurationInSeconds: number;
}

export const useRemotionPlayer = ({
  playerRef,
  isOpen,
  totalDurationInSeconds
}: UseRemotionPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
      setIsReady(false);
      if (playerRef.current) {
        playerRef.current.seekTo(0);
        playerRef.current.pause();
      }
    } else if (isOpen && playerRef.current) {
      // 모달이 열릴 때 첫 프레임 표시
      playerRef.current.seekTo(0);
      playerRef.current.pause();
      setIsPlaying(false);
      
      // 초기 볼륨을 1(100%)로 설정
      playerRef.current.setVolume(1);
      setVolume(1);
      
      // 충분한 시간을 두고 모든 요소(비디오, 텍스트, 오디오)가 렌더링될 때까지 대기
      // CompositePreview의 delayRender가 모두 완료될 시간 확보
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 2500); // 2.5초로 증가 - 폰트 로딩 및 비디오 버퍼링 시간 확보
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, playerRef]);

  // 시간 업데이트 폴링 (Remotion Player의 제한으로 인해 폴링 사용)
  useEffect(() => {
    if (!playerRef.current || !isOpen) return;
    
    const updateTime = () => {
      const frame = playerRef.current?.getCurrentFrame();
      if (frame !== undefined) {
        setCurrentTime(frame / 30);
      }
    };

    // 폴링 시작
    timeUpdateIntervalRef.current = setInterval(updateTime, 100);

    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
    };
  }, [isOpen, playerRef]);

  // 재생/일시정지 핸들러
  const handlePlayPause = useCallback(() => {
    if (!playerRef.current || !isReady) return;
    
    const player = playerRef.current;
    
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      // 재생이 끝났으면 처음부터 다시 재생
      if (currentTime >= totalDurationInSeconds - 0.1) {
        player.seekTo(0);
        setCurrentTime(0);
      }
      player.play();
      setIsPlaying(true);
    }
  }, [playerRef, isPlaying, isReady, currentTime, totalDurationInSeconds]);

  // 시간 이동 핸들러
  const handleSeek = useCallback((newTime: number) => {
    if (!playerRef.current) return;
    
    const frame = Math.round(newTime * 30);
    playerRef.current.seekTo(frame);
    setCurrentTime(newTime);
  }, [playerRef]);

  // 볼륨 변경 핸들러
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [playerRef, isMuted]);

  // 음소거 토글 핸들러
  const handleMuteToggle = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    if (playerRef.current) {
      playerRef.current.setVolume(newMuted ? 0 : volume);
    }
  }, [playerRef, isMuted, volume]);

  // 재생 완료 감지
  useEffect(() => {
    if (isPlaying && currentTime >= totalDurationInSeconds - 0.1) {
      setIsPlaying(false);
      if (playerRef.current) {
        playerRef.current.pause();
      }
    }
  }, [currentTime, totalDurationInSeconds, isPlaying, playerRef]);

  return {
    isPlaying,
    currentTime,
    volume,
    isMuted,
    isReady,
    handlePlayPause,
    handleSeek,
    handleVolumeChange,
    handleMuteToggle,
  };
};