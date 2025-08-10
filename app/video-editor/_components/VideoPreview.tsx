'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { CompositePreview } from '../_remotion/CompositePreview';
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
}

interface VideoPreviewProps {
  clips: PreviewClip[];
  textClips?: TextClipType[];
  soundClips?: SoundClipType[];
  onRemoveClip?: (id: string) => void;
  playerRef?: React.MutableRefObject<PlayerRef | null>;
  currentTime?: number;
  isPlaying?: boolean;
  onPlayStateChange?: (playing: boolean) => void;
}

export default function VideoPreview({ 
  clips, 
  textClips = [], 
  soundClips = [], 
  onRemoveClip,
  playerRef
}: VideoPreviewProps) {
  // SSR-CSR hydration 안정화를 위한 마운트 플래그
  const [is_mounted, setIsMounted] = useState(false);
  // 선택된 프리뷰 대상 클립 ID 관리
  const [selected_preview_clip_id, setSelectedPreviewClipId] = useState<string | null>(null);
  // 캐러셀 현재 인덱스
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const ITEM_WIDTH = 350; // 컨테이너 고정 너비
  const ITEM_HEIGHT = 400; // 컨테이너 고정 높이 (16:9 비율 기준)
  const ITEM_GAP = 20; // 아이템 간격

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 초기/클립 변경 시 기본 선택: 첫 번째 클립
  useEffect(() => {
    if (clips.length === 0) {
      setSelectedPreviewClipId(null);
      setCurrentIndex(0);
    } else if (!selected_preview_clip_id || !clips.some(c => c.id === selected_preview_clip_id)) {
      setSelectedPreviewClipId(clips[0].id);
      setCurrentIndex(0);
    }
  }, [clips, selected_preview_clip_id]);
  
  // 선택된 클립이 변경되면 해당 인덱스로 이동
  useEffect(() => {
    if (selected_preview_clip_id) {
      const index = clips.findIndex(c => c.id === selected_preview_clip_id);
      if (index !== -1 && index !== currentIndex) {
        setCurrentIndex(index);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected_preview_clip_id, clips]); // currentIndex는 의도적으로 제외 (무한 루프 방지)

  // 캐러셀 네비게이션
  const handlePrevious = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    setCurrentIndex(newIndex);
    if (clips[newIndex]) {
      setSelectedPreviewClipId(clips[newIndex].id);
    }
  };

  const handleNext = () => {
    const newIndex = Math.min(clips.length - 1, currentIndex + 1);
    setCurrentIndex(newIndex);
    if (clips[newIndex]) {
      setSelectedPreviewClipId(clips[newIndex].id);
    }
  };
  
  // 특정 인덱스로 이동
  const goToIndex = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(clips.length - 1, index)));
    if (clips[index]) {
      setSelectedPreviewClipId(clips[index].id);
    }
  };

  // 네비게이션 가능 여부
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < clips.length - 1;
  
  // 슬라이드 위치 계산
  const calculateTransform = () => {
    const containerWidth = containerRef.current?.offsetWidth || 0;
    const itemTotalWidth = ITEM_WIDTH + ITEM_GAP;
    // 현재 인덱스의 아이템을 컨테이너 중앙에 배치
    const centerOffset = (containerWidth - ITEM_WIDTH) / 2;
    const slideOffset = -(currentIndex * itemTotalWidth);
    return slideOffset + centerOffset;
  };
  
  // 총 프레임 계산 (픽셀 기반 - 40px = 1초 = 30프레임)
  const calculateTotalFrames = useMemo(() => {
    const totalPx = clips.reduce((sum, clip) => sum + clip.duration, 0);
    const totalSeconds = totalPx / 40; // 40px = 1초
    return Math.max(30, Math.round(totalSeconds * 30)); // 최소 1초(30프레임) 보장
  }, [clips]);
  
  // 비디오 비율 자동 감지 (첫 번째 클립 기준)
  const [videoAspectRatio, setVideoAspectRatio] = useState<{ width: number; height: number }>({ 
    width: 1080, 
    height: 1920 
  });
  
  useEffect(() => {
    if (clips.length > 0 && clips[0].url) {
      const video = document.createElement('video');
      video.src = clips[0].url;
      video.onloadedmetadata = () => {
        setVideoAspectRatio({
          width: video.videoWidth || 1080,
          height: video.videoHeight || 1920
        });
      };
    }
  }, [clips]);

  if (!is_mounted) return null;

  return (
    <div className="flex-1 bg-black flex items-center">
      <div className="flex gap-4 w-full h-full">
        {/* 좌측 50%: 캐러셀 형태의 클립 슬롯 */}
        <div className="w-1/2 flex flex-col items-center justify-center relative">
          {/* 캐러셀 컨테이너 */}
          <div className="flex items-center gap-2 w-full h-full relative">
          {/* 이전 버튼 */}
          <button
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-all ${
              canGoPrevious 
                ? 'bg-white/10 hover:bg-white/20 text-white cursor-pointer' 
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
            aria-label="Previous clips"
          >
            <i className="ri-arrow-left-s-line text-xl"></i>
          </button>

          {/* 클립 슬롯들 */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-hidden relative h-full"
          >
            <div 
              className="flex items-center h-full"
              style={{
                transform: `translateX(${calculateTransform()}px)`,
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {clips.map((clip, index) => {
                const distance = Math.abs(index - currentIndex);
                const isCenter = index === currentIndex;
                const isAdjacent = distance === 1;
                const scale = isCenter ? 1.1 : isAdjacent ? 0.9 : 0.75;
                const opacity = isCenter ? 1 : isAdjacent ? 0.8 : 0.5;
                
                return (
                  <div 
                    key={clip.id} 
                    className={`flex-shrink-0 transition-all duration-300 flex items-center group ${
                      !isCenter ? 'hover:opacity-100' : ''
                    }`}
                    style={{
                      width: `${ITEM_WIDTH}px`,
                      height: `${ITEM_HEIGHT}px`,
                      marginRight: `${ITEM_GAP}px`,
                      transform: `scale(${scale})`,
                      opacity: opacity,
                    }}
                  >
                    <div className="bg-gray-900 rounded-lg overflow-hidden w-full h-full relative transition-all duration-200 hover:shadow-xl hover:shadow-black/50">
                      <div
                        role="button"
                        tabIndex={0}
                        className="relative w-full h-full cursor-pointer transition-all duration-200 hover:scale-105"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToIndex(index);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            goToIndex(index);
                          }
                        }}
                      >
                        {/* 썸네일 이미지 - object-contain으로 비율 유지 */}
                        {clip.thumbnail ? (
                          <div
                            className="absolute inset-0 bg-center bg-no-repeat transition-all duration-200 hover:brightness-110"
                            style={{ 
                              backgroundImage: `url('${clip.thumbnail}')`,
                              backgroundSize: 'contain'
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                            <i className="ri-video-line text-4xl"></i>
                          </div>
                        )}
                        
                        {/* 중앙 클립 강조 효과 */}
                        {isCenter && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                        )}
                        
                        {/* 삭제 버튼 - 중앙 클립에만 표시 */}
                        {onRemoveClip && isCenter && (
                          <div className="absolute bottom-2 right-2">
                            <div
                              role="button"
                              tabIndex={0}
                              className="w-7 h-7 flex items-center justify-center bg-black/40 hover:bg-black/60 rounded transition-opacity"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                onRemoveClip(clip.id);
                                // 삭제 후 인덱스 조정
                                if (index === clips.length - 1 && index > 0) {
                                  setCurrentIndex(index - 1);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onRemoveClip(clip.id);
                                }
                              }}
                              aria-label="Remove clip"
                            >
                              <i className="ri-delete-bin-line text-white text-xs"></i>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* 빈 상태 표시 */}
              {clips.length === 0 && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-gray-500 text-sm">
                    No clips added yet
                  </div>
                </div>
              )}
            </div>
          </div>

            {/* 다음 버튼 */}
            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                canGoNext 
                  ? 'bg-white/10 hover:bg-white/20 text-white cursor-pointer' 
                  : 'bg-white/5 text-gray-600 cursor-not-allowed'
              }`}
              aria-label="Next clips"
            >
              <i className="ri-arrow-right-s-line text-xl"></i>
            </button>
          </div>
          
          {/* 페이지 인디케이터 - 하단에 위치 */}
          {clips.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1.5 bg-black/50 px-3 py-2 rounded-full">
              {clips.map((_, index) => {
                const isActive = index === currentIndex;
                return (
                  <button
                    key={index}
                    onClick={() => goToIndex(index)}
                    className={`rounded-full transition-all duration-300 ${
                      isActive 
                        ? 'bg-[#38f47cf9] w-6 h-1.5' 
                        : 'bg-gray-600 w-1.5 h-1.5 hover:bg-gray-500'
                    }`}
                    aria-label={`Go to clip ${index + 1}`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* 우측 50%: 미리보기 플레이어 - 모든 트랙 합성 */}
        <div className="w-1/2 bg-gray-900 rounded-lg overflow-hidden relative">
          <div className="absolute top-2 left-2 z-10 bg-black/50 px-2 py-1 rounded text-xs font-medium">
            Preview (All Tracks)
          </div>
          <div className="w-full h-full bg-black">
            {clips.length > 0 || textClips.length > 0 || soundClips.length > 0 ? (
              <Player
                ref={playerRef}
                component={CompositePreview}
                inputProps={{
                  videoClips: clips,
                  textClips: textClips,
                  soundClips: soundClips,
                  pixelsPerSecond: 40
                }}
                durationInFrames={calculateTotalFrames}
                compositionWidth={videoAspectRatio.width}
                compositionHeight={videoAspectRatio.height}
                fps={30}
                style={{ 
                  width: '100%', 
                  height: '100%'
                }}
                controls={false}
                loop
                showVolumeControls={false}
                clickToPlay={false}
                doubleClickToFullscreen={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-gray-500 text-sm">
                  Add clips to see preview
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}