'use client';

import { useRef, useMemo, useCallback } from 'react';
import { Player, PlayerRef, RenderPoster } from '@remotion/player';
import { CompositePreview } from './remotion/CompositePreview';
import { PlayerControls } from './PlayerControls';
import { BufferingSpinner } from './BufferingSpinner';
import { useRemotionPlayer } from '../_hooks/useRemotionPlayer';
import { TextClip as TextClipType, SoundClip as SoundClipType } from '@/types/video-editor';

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

  // 커스텀 훅으로 플레이어 상태 및 핸들러 관리
  const {
    isPlaying,
    currentTime,
    volume,
    isMuted,
    isReady,
    handlePlayPause,
    handleSeek,
    handleVolumeChange,
    handleMuteToggle,
  } = useRemotionPlayer({
    playerRef,
    isOpen,
    totalDurationInSeconds
  });

  // renderPoster 콜백 정의
  const renderPoster: RenderPoster = useCallback(({ isBuffering }) => {
    if (isBuffering && !isReady) {
      return <BufferingSpinner />;
    }
    return null;
  }, [isReady]);


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
                textClips: textClips,  // 항상 텍스트 클립 전달
                soundClips: soundClips,
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
              showPosterWhenPaused={false}  // 일시정지 시에는 포스터 표시 안함
            />
            
            {/* 로딩 오버레이 */}
            {!isReady && <BufferingSpinner isOverlay />}
          </div>
        </div>
        
        {/* 분리된 컨트롤 컴포넌트 사용 */}
        <PlayerControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={totalDurationInSeconds}
          volume={volume}
          isMuted={isMuted}
          isReady={isReady}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onMuteToggle={handleMuteToggle}
        />
      </div>
    </div>
  );
}