'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Player, PlayerRef, RenderPoster } from '@remotion/player';
import { CompositePreview } from '../_remotion/CompositePreview';
import { TextClip as TextClipType, SoundClip as SoundClipType } from '@/types/video-editor';
import { AbsoluteFill } from 'remotion';

interface PreviewClip {
  id: string;
  thumbnail?: string;
  url?: string;
  duration: number;
  thumbnails?: number;
  position?: number;
  title?: string;
  maxDuration?: number;
  startTime?: number;
  endTime?: number;
}

interface FullscreenPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  clips: PreviewClip[];
  textClips?: TextClipType[];
  soundClips?: SoundClipType[];
  aspectRatio?: '9:16' | '1:1' | '16:9';
  videoWidth?: number;
  videoHeight?: number;
}

export default function FullscreenPreviewModal({
  isOpen,
  onClose,
  clips,
  textClips = [],
  soundClips = [],
  aspectRatio = '9:16',
  videoWidth = 1080,
  videoHeight = 1920
}: FullscreenPreviewModalProps) {
  const playerRef = useRef<PlayerRef | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  
  // 총 프레임 계산 (픽셀 기반 - 40px = 1초 = 30프레임)
  const calculateTotalFrames = useMemo(() => {
    // 각 트랙의 끝 위치 계산 (position + duration)
    const videoEnd = clips.length > 0 
      ? Math.max(...clips.map(c => (c.position || 0) + c.duration))
      : 0;
    const textEnd = textClips.length > 0
      ? Math.max(...textClips.map(c => (c.position || 0) + c.duration))
      : 0;
    const soundEnd = soundClips.length > 0
      ? Math.max(...soundClips.map(c => (c.position || 0) + c.duration))
      : 0;
    
    // 모든 트랙 중 가장 끝 위치
    const totalPx = Math.max(videoEnd, textEnd, soundEnd);
    const totalSeconds = totalPx / 40; // 40px = 1초
    return Math.max(30, Math.round(totalSeconds * 30)); // 최소 1초(30프레임) 보장
  }, [clips, textClips, soundClips]);
  
  const totalDurationInSeconds = useMemo(() => {
    return calculateTotalFrames / 30;
  }, [calculateTotalFrames]);

  // renderPoster 콜백 정의
  const renderPoster: RenderPoster = useCallback(({ isBuffering }) => {
    if (isBuffering) {
      return (
        <AbsoluteFill style={{ 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: 'black'
        }}>
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-600 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#38f47cf9] rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-white text-lg font-medium">Rendering...</p>
          </div>
        </AbsoluteFill>
      );
    }
    return null;
  }, []);

  // 모달이 열리면 자동 재생 및 버퍼링 상태 추적
  useEffect(() => {
    if (isOpen && playerRef.current) {
      setIsBuffering(true); // 초기 버퍼링 상태
      let hasStartedPlaying = false;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const player = playerRef.current as any;
      
      // 버퍼링 시작
      const handleWaiting = () => {
        setIsBuffering(true);
      };
      
      // 버퍼링 끝
      const handleResume = () => {
        setIsBuffering(false);
        // 첫 렌더링 완료 후 자동 재생
        if (!hasStartedPlaying && playerRef.current) {
          setTimeout(() => {
            playerRef.current?.play();
            setIsPlaying(true);
            hasStartedPlaying = true;
          }, 500); // 약간의 지연 후 재생
        }
      };
      
      // 첫 프레임 렌더링 완료
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleFrameUpdate = (e: any) => {
        if (e.detail && e.detail.frame >= 0 && isBuffering) {
          setIsBuffering(false);
          // 첫 렌더링 완료 후 자동 재생
          if (!hasStartedPlaying && playerRef.current) {
            setTimeout(() => {
              playerRef.current?.play();
              setIsPlaying(true);
              hasStartedPlaying = true;
            }, 500); // 약간의 지연 후 재생
          }
        }
      };
      
      // 재생 종료 이벤트
      const handleEnded = () => {
        setIsPlaying(false);
        // 처음으로 되돌리기
        if (playerRef.current) {
          playerRef.current.seekTo(0);
        }
      };
      
      // 이벤트 리스너 등록
      if (player.addEventListener) {
        player.addEventListener('waiting', handleWaiting);
        player.addEventListener('resume', handleResume);
        player.addEventListener('frameupdate', handleFrameUpdate);
        player.addEventListener('ended', handleEnded);
      }
      
      // 자동 재생 제거 (렌더링 완료 후 재생하도록 변경)
      
      return () => {
        // 이벤트 리스너 정리
        if (player.removeEventListener) {
          player.removeEventListener('waiting', handleWaiting);
          player.removeEventListener('resume', handleResume);
          player.removeEventListener('frameupdate', handleFrameUpdate);
          player.removeEventListener('ended', handleEnded);
        }
      };
    } else {
      // 모달이 닫히면 버퍼링 상태 초기화
      setIsBuffering(true);
      setIsPlaying(false);
    }
  }, [isOpen, isBuffering]);

  // 재생 상태 업데이트
  useEffect(() => {
    if (!playerRef.current) return;
    
    const interval = setInterval(() => {
      const frame = playerRef.current?.getCurrentFrame();
      if (frame !== undefined) {
        setCurrentTime(frame / 30); // 프레임을 초로 변환
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      if (playerRef.current) {
        playerRef.current.setVolume(volume);
      }
    } else {
      setIsMuted(true);
      if (playerRef.current) {
        playerRef.current.setVolume(0);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    const frame = Math.round(newTime * 30);
    if (playerRef.current) {
      playerRef.current.seekTo(frame);
      setCurrentTime(newTime);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/90 z-[9998]"
        onClick={onClose}
      />
      
      {/* 모달 콘텐츠 */}
      <div className="relative w-[90vw] h-[90vh] bg-gray-900 rounded-lg flex flex-col z-[9999]">
        {/* 헤더 */}
        <div className="absolute top-4 right-4 z-[10000]">
          <button
            onClick={onClose}
            className="p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
          >
            <i className="ri-close-line text-2xl text-white"></i>
          </button>
        </div>
        
        {/* 비디오 플레이어 영역 */}
        <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
          <div 
            className="relative h-full flex items-center justify-center"
            style={{ 
              width: '100%',
              maxWidth: aspectRatio === '16:9' ? '95%' : 
                       aspectRatio === '1:1' ? '60%' : '40%'
            }}
          >
            <Player
              ref={playerRef}
              component={CompositePreview}
              inputProps={{
                videoClips: clips,
                textClips: isBuffering ? [] : textClips,  // 버퍼링 중에는 텍스트 숨김
                soundClips: soundClips,
                pixelsPerSecond: 40,
                backgroundColor: 'black'
              }}
              durationInFrames={calculateTotalFrames}
              compositionWidth={videoWidth}
              compositionHeight={videoHeight}
              fps={30}
              style={{ 
                width: '100%',
                height: '100%',
                maxHeight: '85vh',
                aspectRatio: aspectRatio.replace(':', '/')
              }}
              controls={false}
              showVolumeControls={false}
              clickToPlay={false}
              doubleClickToFullscreen={false}
              loop={false}
              moveToBeginningWhenEnded={true}
              renderPoster={renderPoster}
              showPosterWhenBuffering={true}
            />
          </div>
        </div>
        
        {/* 컨트롤 바 */}
        <div className="bg-gray-800 p-4 relative z-[10000] flex-shrink-0">
          <div className="flex flex-col gap-3">
            {/* 진행 바 */}
            <div className="flex items-center gap-3">
              <span className="text-white text-sm min-w-[50px]">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={totalDurationInSeconds}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #38f47cf9 0%, #38f47cf9 ${(currentTime / totalDurationInSeconds) * 100}%, #4b5563 ${(currentTime / totalDurationInSeconds) * 100}%, #4b5563 100%)`
                }}
              />
              <span className="text-white text-sm min-w-[50px] text-right">
                {formatTime(totalDurationInSeconds)}
              </span>
            </div>
            
            {/* 컨트롤 버튼들 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* 재생/일시정지 버튼 */}
                <button
                  onClick={handlePlayPause}
                  className="p-3 bg-[#38f47cf9] rounded-full hover:bg-[#38f47cf9]/80 transition-colors"
                >
                  <i className={`${isPlaying ? 'ri-pause-fill' : 'ri-play-fill'} text-2xl text-black`}></i>
                </button>
                
                {/* 볼륨 컨트롤 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMuteToggle}
                    className="p-2 text-white hover:text-[#38f47cf9] transition-colors"
                  >
                    <i className={`${isMuted ? 'ri-volume-mute-fill' : 'ri-volume-up-fill'} text-xl`}></i>
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #38f47cf9 0%, #38f47cf9 ${(isMuted ? 0 : volume) * 100}%, #4b5563 ${(isMuted ? 0 : volume) * 100}%, #4b5563 100%)`
                    }}
                  />
                </div>
              </div>
              
              {/* 우측 정보 */}
              <div className="text-white text-sm">
                <span className="text-gray-400">Fullscreen Preview</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #38f47cf9;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #38f47cf9;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}