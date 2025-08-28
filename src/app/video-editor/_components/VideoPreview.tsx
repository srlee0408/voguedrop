'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Player, PlayerRef } from '@remotion/player';
import { useClips } from '../_context/ClipContext';
import { CompositePreview } from './remotion/CompositePreview';
import { TextClip as TextClipType, SoundClip as SoundClipType } from '@/shared/types/video-editor';
import TextOverlayEditor from './TextOverlayEditor';
import FullscreenPreviewModal from './FullscreenPreviewModal';
import RenderingModal from './RenderingModal';
import { BufferingSpinner } from './BufferingSpinner';
import { ASPECT_RATIOS, CAROUSEL_CONFIG, STYLES, AspectRatioValue } from '../_constants';
import { useMediaCache } from '@/features/video-editing/_hooks/useMediaCache';

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

interface VideoPreviewProps {
  clips: PreviewClip[];
  textClips?: TextClipType[];
  soundClips?: SoundClipType[];
  onRemoveClip?: (id: string) => void;
  playerRef?: React.MutableRefObject<PlayerRef | null>;
  currentTime?: number;
  isPlaying?: boolean;
  onPlayStateChange?: (playing: boolean) => void;
  onUpdateTextPosition?: (id: string, x: number, y: number) => void;
  onUpdateTextSize?: (id: string, fontSize: number, fontSizeRatio: number) => void;
  selectedTextClip?: string | null;
  onSelectTextClip?: (id: string | null) => void;
  projectTitle?: string;
  onSaveProject?: () => Promise<void>; // 외부에서 전달받는 저장 함수
}

export default function VideoPreview({ 
  clips, 
  textClips = [], 
  soundClips = [], 
  onRemoveClip,
  playerRef,
  onUpdateTextPosition,
  onUpdateTextSize,
  selectedTextClip,
  onSelectTextClip,
  projectTitle = 'Untitled Project',
  currentTime,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isPlaying,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onPlayStateChange,
  onSaveProject
}: VideoPreviewProps) {
  // SSR-CSR hydration 안정화를 위한 마운트 플래그
  const [is_mounted, setIsMounted] = useState(false);
  // 선택된 프리뷰 대상 클립 ID 관리
  const [selected_preview_clip_id, setSelectedPreviewClipId] = useState<string | null>(null);
  // 캐러셀 현재 인덱스
  const [currentIndex, setCurrentIndex] = useState(0);
  // 전체 화면 미리보기 모달 상태
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  // 버퍼링 상태 추적
  const [isBuffering, setIsBuffering] = useState(false);
  // 렌더링 상태
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderComplete, setRenderComplete] = useState(false);
  const [renderOutputUrl, setRenderOutputUrl] = useState<string | null>(null);
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);
  
  // 저장 관련 상태
  const [isSaving, setIsSaving] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { ITEM_WIDTH, ITEM_HEIGHT, ITEM_GAP } = CAROUSEL_CONFIG;
  
  // ClipContext에서 저장 관련 상태 가져오기
  const { hasUnsavedChanges } = useClips();
  
  // 비디오 URL 목록 추출 및 미디어 캐싱 적용
  const videoUrls = useMemo(() => clips.map(clip => clip.url), [clips]);
  useMediaCache(videoUrls, {
    autoPreload: true,
    extractThumbnails: true,
    extractMetadata: true,
    maxConcurrent: 2 // Remotion과 충돌 방지를 위해 낮은 값 설정
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);


  // 스페이스바 재생 단축키는 VideoEditorClient에서 통합 관리됩니다

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
  
  
  // Memoize soundClips with volume to trigger re-render when volume changes
  const memoizedSoundClips = useMemo(() => {
    return soundClips.map(clip => ({
      ...clip,
      volume: clip.volume !== undefined ? clip.volume : 100 // Ensure volume is included with proper default
    }));
  }, [soundClips]);

  // Player 이벤트 리스너 설정 - 버퍼링 상태 추적 및 초기 볼륨 설정
  useEffect(() => {
    let volumeInterval: NodeJS.Timeout | null = null;
    let volumeTimeout: NodeJS.Timeout | null = null;
    
    // Player가 실제로 준비될 때까지 대기하며 볼륨 설정
    const checkAndSetVolume = () => {
      if (playerRef?.current) {
        try {
          playerRef.current.setVolume(1);
          
          // 이벤트 리스너 설정
          const player = playerRef.current;
          
          // waiting 이벤트 - 버퍼링 시작
          const handleWaiting = () => {
            setIsBuffering(true);
          };
          
          // resume 이벤트 - 버퍼링 종료
          const handleResume = () => {
            setIsBuffering(false);
          };
          
          // 이벤트 리스너 등록
          player.addEventListener('waiting', handleWaiting);
          player.addEventListener('resume', handleResume);
          
          // 클린업 함수 저장
          return () => {
            player.removeEventListener('waiting', handleWaiting);
            player.removeEventListener('resume', handleResume);
          };
        } catch {
          return null;
        }
      }
      return null;
    };
    
    // 즉시 시도
    const cleanup = checkAndSetVolume();
    if (!cleanup) {
      // 실패하면 짧은 간격으로 재시도
      volumeInterval = setInterval(() => {
        const cleanup = checkAndSetVolume();
        if (cleanup) {
          if (volumeInterval) clearInterval(volumeInterval);
          if (volumeTimeout) clearTimeout(volumeTimeout);
        }
      }, 100);
      
      // 최대 5초 후 정리
      volumeTimeout = setTimeout(() => {
        if (volumeInterval) clearInterval(volumeInterval);
      }, 5000);
    }
    
    // 클린업
    return () => {
      if (volumeInterval) clearInterval(volumeInterval);
      if (volumeTimeout) clearTimeout(volumeTimeout);
      cleanup?.();
    };
  }, [playerRef, clips.length, soundClips.length]); // clips나 soundClips 변경 시 재설정
  
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
  
  // 화면 비율 옵션
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatioValue>('9:16');
  
  // 선택된 비율에 따른 실제 크기 계산
  const getAspectRatioDimensions = (ratio: AspectRatioValue) => {
    const ratioConfig = Object.values(ASPECT_RATIOS).find(r => r.value === ratio);
    return ratioConfig || ASPECT_RATIOS.MOBILE;
  };
  
  const aspectRatioDimensions = getAspectRatioDimensions(selectedAspectRatio);
  const videoAspectRatio = {
    width: aspectRatioDimensions.width,
    height: aspectRatioDimensions.height
  };

  // content hash 생성 함수 (SHA256 사용)
  const generateContentHash = async (data: {
    videoClips: unknown[];
    textClips: unknown[];
    soundClips: unknown[];
    aspectRatio: string;
  }): Promise<string> => {
    const essentialData = {
      aspectRatio: data.aspectRatio,
      videoClips: (data.videoClips as unknown[]).map((clip: unknown) => {
        const c = clip as Record<string, unknown>;
        return {
          url: c.url,
          position: c.position,
          duration: c.duration,
          startTime: c.startTime || 0,
          endTime: c.endTime
        };
      }).sort((a, b) => (a.position as number) - (b.position as number)),
      textClips: (data.textClips as unknown[]).map((text: unknown) => {
        const t = text as Record<string, unknown>;
        return {
          content: t.content,
          position: t.position,
          duration: t.duration,
          style: t.style,
          effect: t.effect
        };
      }).sort((a, b) => (a.position as number) - (b.position as number)),
      soundClips: (data.soundClips as unknown[]).map((sound: unknown) => {
        const s = sound as Record<string, unknown>;
        return {
          url: s.url,
          position: s.position,
          duration: s.duration,
          volume: s.volume,
          startTime: s.startTime || 0
        };
      }).sort((a, b) => (a.position as number) - (b.position as number))
    };
    
    // 브라우저에서 Web Crypto API 사용
    const msgUint8 = new TextEncoder().encode(JSON.stringify(essentialData));
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  // Export Video 핸들러 (Save + Download 통합)
  const handleExportVideo = async () => {
    if (clips.length === 0) {
      toast.error('Please add video clips first.');
      return;
    }

    // 2분(120초) 제한 체크
    const totalDurationInSeconds = calculateTotalFrames / 30; // 30fps 기준
    if (totalDurationInSeconds > 120) {
      toast.error(
        `Timeline cannot exceed 2 minutes (Current: ${Math.floor(totalDurationInSeconds / 60)}m ${Math.floor(totalDurationInSeconds % 60)}s)`,
        { duration: 5000 }
      );
      return;
    }

    setIsRendering(true);
    setRenderProgress(0);
    setIsRenderModalOpen(true);

    try {
      // 1. content hash 생성
      const contentHash = await generateContentHash({
        videoClips: clips,
        textClips: textClips,
        soundClips: memoizedSoundClips,
        aspectRatio: selectedAspectRatio
      });
      
      // 2. 기존 렌더링 확인
      const checkResponse = await fetch(`/api/video/check-render?hash=${encodeURIComponent(contentHash)}`);
      
      if (!checkResponse.ok) {
        console.error('Failed to check existing render');
        // 체크 실패해도 계속 진행 (새 렌더링)
      } else {
        const checkResult = await checkResponse.json();
        
        // 3. 기존 렌더링이 있으면 바로 다운로드
        if (checkResult.exists && checkResult.outputUrl) {
          setRenderOutputUrl(checkResult.outputUrl);
          setIsRendering(false);
          setIsRenderModalOpen(false);
          
          // 바로 다운로드 실행
          const link = document.createElement('a');
          link.href = checkResult.outputUrl;
          link.download = `${projectTitle || 'video'}-${Date.now()}.mp4`;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          console.log('Using existing render:', checkResult.renderId);
          return; // 렌더링 불필요
        }
      }

      // 4. 기존 렌더링이 없으면 새로 렌더링
      const response = await fetch('/api/video/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoClips: clips,
          textClips: textClips,
          soundClips: memoizedSoundClips,
          aspectRatio: selectedAspectRatio,
          durationInFrames: calculateTotalFrames,
          projectName: projectTitle,
          contentHash: contentHash, // content hash 추가
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Render failed');
      }

      const result = await response.json();

      if (result.success && result.renderId) {
        console.log('Render started:', result);
        
        // 진행 상황 확인 간격 개선 - 초반에는 자주, 후반에는 덜 자주
        let checkInterval = 2500; // 초기 간격 2.5초
        const maxInterval = 20000; // 최대 20초
        const maxAttempts = 30; // 최대 10분
        let attempts = 0;

        const checkProgress = async () => {
          try {
            const statusResponse = await fetch(
              `/api/video/render?renderId=${result.renderId}&bucketName=${result.bucketName}`
            );
            
            if (!statusResponse.ok) {
              throw new Error('Failed to check status');
            }

            const status = await statusResponse.json();
            
            if (status.done && status.outputFile) {
              // 렌더링 완료 - Save API 호출하여 Supabase에 저장
              const finalSaveResponse = await fetch('/api/video/save', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  projectName: projectTitle,
                  videoClips: clips,
                  textClips: textClips,
                  soundClips: memoizedSoundClips,
                  aspectRatio: selectedAspectRatio,
                  durationInFrames: calculateTotalFrames,
                  renderId: result.renderId,
                  renderOutputUrl: status.outputFile,
                }),
              });

              if (finalSaveResponse.ok) {
                const finalSaveResult = await finalSaveResponse.json();
                
                // Supabase URL이 있으면 사용, 없으면 S3 URL 사용
                const videoUrl = finalSaveResult.videoUrl || status.outputFile;
                setRenderOutputUrl(videoUrl);
                setRenderComplete(true);
                setIsRendering(false);
                setRenderProgress(100);
                
                console.log('Video saved to:', finalSaveResult.storageLocation, videoUrl);
                
              } else {
                // Save 실패해도 S3 URL은 사용 가능
                setRenderOutputUrl(status.outputFile);
                setRenderComplete(true);
                setIsRendering(false);
                setRenderProgress(100);
              }
            } else if (attempts < maxAttempts) {
              // 진행률 업데이트
              setRenderProgress(Math.round((status.overallProgress || 0) * 100));
              attempts++;
              
              // 체크 간격을 점진적으로 증가
              if (attempts === 0) {
                checkInterval = 3000; // 첫 번째 재귀는 3초
              } else if (attempts === 1) {
                checkInterval = 10000; // 두 번째 재귀는 10초
              } else if (attempts === 2) {
                checkInterval = 15000; // 세 번째 재귀는 15초  
              } else {
                checkInterval = maxInterval; // 이후는 20초
              }
              
              // 다시 체크
              setTimeout(checkProgress, checkInterval);
            } else {
              // 타임아웃
              throw new Error('Rendering timeout exceeded.');
            }
          } catch (error) {
            console.error('Progress check error:', error);
            setIsRendering(false);
            setRenderProgress(0);
            alert('Error checking render status.');
          }
        };

        // 2초 후 첫 체크 시작 (빠른 피드백 제공)
        setTimeout(checkProgress, 2000);
      } else {
        throw new Error('Failed to start rendering.');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsRendering(false);
      setRenderProgress(0);
      setIsRenderModalOpen(false);
    }
  };

  // Save Project 핸들러 (외부에서 전달받은 저장 함수 사용)
  const handleSaveProject = useCallback(async () => {
    if (clips.length === 0 && textClips.length === 0 && soundClips.length === 0) {
      toast.error('No content to save');
      return;
    }

    if (!onSaveProject) {
      toast.error('Save function not configured');
      return;
    }

    setIsSaving(true);

    try {
      await onSaveProject();
    } catch (error) {
      console.error('Save error:', error);
      // 에러는 이미 onSaveProject에서 처리됨
    } finally {
      setIsSaving(false);
    }
  }, [clips, textClips, soundClips, onSaveProject]);

  // 저장 단축키 지원 (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        handleSaveProject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSaveProject]);

  if (!is_mounted) return null;

  return (
    <div className="w-full h-full bg-black flex items-center">
      <div className="flex w-full h-full">
        {/* 좌측 50%: 캐러셀 형태의 클립 슬롯 */}
        <div className="w-1/2 flex flex-col items-center justify-center relative pr-2">
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
          {clips.length > 0 ? (
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
              </div>
            </div>
          ) : (
            /* 빈 상태 표시 */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-green-500 text-sm">
                No clips added yet
              </div>
            </div>
          )}

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

        {/* 중앙 구분선 */}
        <div className="w-px bg-gray-700"></div>

        {/* 우측 50%: 편집 화면 - 모든 트랙 합성 */}
        <div className="w-1/2 bg-gray-900 rounded-lg overflow-hidden relative flex flex-col pl-2">
          {/* 상단 컨트롤 바 */}
          <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 px-3 py-2 flex justify-between items-center z-20">
            <div className="flex items-center gap-2">
              <div className="bg-black/50 px-2 py-1 rounded text-xs font-medium">
                Editor
              </div>
            </div>
            {/* 비디오 컨트롤 버튼들 */}
            <div className="flex gap-2">
              {/* Preview 버튼 */}
              <div className="relative group">
                <button 
                  className="p-2 bg-black/50 rounded hover:bg-black/70 transition-colors"
                  onClick={() => setIsFullscreenOpen(true)}
                >
                  <i className="ri-play-circle-line text-primary"></i>
                </button>
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Preview
                </div>
              </div>
              
              {/* Save Project 버튼 */}
              <div className="relative group">
                <button 
                  className={`p-2 bg-black/50 rounded hover:bg-black/70 transition-colors ${
                    hasUnsavedChanges ? 'ring-2 ring-primary/50' : ''
                  }`}
                  onClick={handleSaveProject}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-gray-500 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <i className="ri-save-line text-primary"></i>
                  )}
                </button>
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {isSaving ? 'Saving...' : 'Save Project'}
                </div>
              </div>
              
              {/* Export Video 버튼 (Save + Download 통합) */}
              <div className="relative group">
                <button 
                  className="p-2 bg-black/50 rounded hover:bg-black/70 transition-colors"
                  onClick={handleExportVideo}
                  disabled={isRendering}
                >
                  {isRendering ? (
                    <div className="w-4 h-4 border-2 border-gray-500 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <i className="ri-video-download-line text-primary"></i>
                  )}
                </button>
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {isRendering ? `Rendering... ${renderProgress}%` : 'Export Video'}
                </div>
              </div>
              
              {/* 구분선 */}
              <div className="w-px bg-gray-600 mx-1" />
              
              {/* 화면 비율 선택 버튼 */}
              <div className="flex gap-1 bg-black/50 rounded p-1">
              <button
                onClick={() => setSelectedAspectRatio('9:16')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  selectedAspectRatio === '9:16' 
                    ? 'bg-[#38f47cf9] text-black font-medium' 
                    : 'hover:bg-white/10 text-gray-400'
                }`}
                title="Mobile (9:16)"
              >
                9:16
              </button>
              <button
                onClick={() => setSelectedAspectRatio('1:1')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  selectedAspectRatio === '1:1' 
                    ? 'bg-[#38f47cf9] text-black font-medium' 
                    : 'hover:bg-white/10 text-gray-400'
                }`}
                title="Square (1:1)"
              >
                1:1
              </button>
              <button
                onClick={() => setSelectedAspectRatio('16:9')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  selectedAspectRatio === '16:9' 
                    ? 'bg-[#38f47cf9] text-black font-medium' 
                    : 'hover:bg-white/10 text-gray-400'
                }`}
                title="Wide (16:9)"
              >
                16:9
              </button>
              </div>
            </div>
          </div>
          {/* 비디오 프리뷰 영역 */}
          <div className="flex-1 relative flex items-center justify-center p-2 bg-gray-500">
            {/* 체커보드 패턴 오버레이 */}
            <div className="absolute inset-0">
              <div className="h-full w-full" style={{
                backgroundImage: 'linear-gradient(45deg, #606060 25%, transparent 25%), linear-gradient(-45deg, #606060 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #606060 75%), linear-gradient(-45deg, transparent 75%, #606060 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                backgroundColor: '#505050'
              }} />
            </div>
            {clips.length > 0 || textClips.length > 0 || soundClips.length > 0 ? (
              <div 
                className="relative shadow-2xl"
                style={{
                  width: selectedAspectRatio === '16:9' ? '95%' : 
                         selectedAspectRatio === '1:1' ? 'auto' : 'auto',
                  height: selectedAspectRatio === '16:9' ? 'auto' : 
                          selectedAspectRatio === '1:1' ? '95%' : '95%',
                  maxWidth: '95%',
                  maxHeight: '95%',
                  aspectRatio: aspectRatioDimensions.displayRatio,
                }}
              >
                {/* 빨간 테두리 - 시각적 가이드 (오버레이 클릭 방해하지 않도록 뒤로 보내고 포인터 이벤트 비활성화) */}
                <div 
                  className="absolute inset-0 z-10"
                  style={{
                    border: `2px solid ${STYLES.BORDER_COLOR}`,
                    borderRadius: '0.5rem',
                    pointerEvents: 'none'
                  }}
                />
                
                {/* 콘텐츠 컨테이너 */}
                <div 
                  className="relative w-full h-full rounded-lg overflow-hidden"
                  style={{ 
                    backgroundColor: 'transparent'
                  }}
                >
                  <Player
                  ref={playerRef}
                  component={CompositePreview as unknown as React.ComponentType<Record<string, unknown>>}
                  inputProps={{
                    videoClips: clips,
                    textClips: textClips, // 텍스트 효과를 표시하기 위해 실제 데이터 전달
                    soundClips: memoizedSoundClips,
                    pixelsPerSecond: 40,
                    backgroundColor: 'black' // 항상 검은색 배경으로 설정하여 letterbox 효과
                  }}
                  durationInFrames={calculateTotalFrames}
                  compositionWidth={videoAspectRatio.width}
                  compositionHeight={videoAspectRatio.height}
                  fps={30}
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    display: 'block'
                  }}
                  controls={false}
                  showVolumeControls={true}
                  clickToPlay={false}
                  doubleClickToFullscreen={false}
                  />
                  
                  {/* Buffering indicator overlay */}
                  {isBuffering && (
                    <BufferingSpinner
                      message="Buffering"
                      submessage="Loading content..."
                      isOverlay={true}
                      overlayOpacity="light"
                    />
                  )}
                  
                  
                  {/* 텍스트 편집 오버레이 - Player와 같은 컨테이너 내에 위치 */}
                  <TextOverlayEditor
                    textClips={textClips}
                    containerWidth={videoAspectRatio.width}
                    containerHeight={videoAspectRatio.height}
                    currentTime={currentTime || 0}
                    pixelsPerSecond={40}
                    onUpdatePosition={(id, x, y) => {
                      if (onUpdateTextPosition) {
                        onUpdateTextPosition(id, x, y);
                      }
                    }}
                    onUpdateSize={(id, fontSize, fontSizeRatio) => {
                      if (onUpdateTextSize) {
                        onUpdateTextSize(id, fontSize, fontSizeRatio);
                      }
                    }}
                    selectedClip={selectedTextClip || null}
                    onSelectClip={(id) => {
                      if (onSelectTextClip) {
                        onSelectTextClip(id);
                      }
                    }}
                    aspectRatio={selectedAspectRatio}
                  />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-8">
                <div 
                  className="relative shadow-2xl"
                  style={{
                    width: selectedAspectRatio === '16:9' ? '95%' : 
                           selectedAspectRatio === '1:1' ? 'auto' : 'auto',
                    height: selectedAspectRatio === '16:9' ? 'auto' : 
                            selectedAspectRatio === '1:1' ? '95%' : '95%',
                    maxWidth: '95%',
                    maxHeight: '95%',
                    aspectRatio: aspectRatioDimensions.displayRatio,
                  }}
                >
                  {/* 빨간 테두리 - 시각적 가이드 (오버레이 클릭 방해하지 않도록 뒤로 보내고 포인터 이벤트 비활성화) */}
                  <div 
                    className="absolute inset-0 z-10"
                    style={{
                      border: `2px solid ${STYLES.BORDER_COLOR}`,
                      borderRadius: '0.5rem',
                      pointerEvents: 'none'
                    }}
                  />
                  
                  {/* 콘텐츠 */}
                  <div 
                    className="relative w-full h-full rounded-lg flex items-center justify-center"
                    style={{ 
                      backgroundColor: 'transparent'
                    }}
                  >
                    <div className="text-green-500 text-sm text-center">
                      <div className="mb-2">Add clips to see preview</div>
                      <div className="text-xs text-green-500">
                      
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 전체 화면 미리보기 모달 */}
      <FullscreenPreviewModal
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        clips={clips}
        textClips={textClips}
        soundClips={memoizedSoundClips}
        aspectRatio={selectedAspectRatio}
        videoWidth={videoAspectRatio.width}
        videoHeight={videoAspectRatio.height}
      />
      
      {/* 렌더링 모달 */}
      <RenderingModal
        isOpen={isRenderModalOpen}
        onClose={() => {
          setIsRenderModalOpen(false);
          setRenderComplete(false);
          setRenderProgress(0);
        }}
        renderProgress={renderProgress}
        renderComplete={renderComplete}
        renderOutputUrl={renderOutputUrl}
      />
    </div>
  );
}