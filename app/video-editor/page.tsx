'use client';

import { useState, useEffect, useRef } from 'react';
import { PlayerRef } from '@remotion/player';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import VideoPreview from './_components/VideoPreview';
import Timeline from './_components/Timeline';
import VideoLibraryModal from './_components/VideoLibraryModal';
import SoundLibraryModal from './_components/SoundLibraryModal';
import TextEditorModal from './_components/TextEditorModal';
import { VideoClip, TextClip, SoundClip, LibraryVideo } from '@/types/video-editor';
import { 
  duplicateVideoClip, 
  duplicateTextClip, 
  duplicateSoundClip,
  splitVideoClip,
  splitTextClip,
  splitSoundClip,
  applyResizeTrim,
} from './_utils/clip-operations';

// 히스토리 상태 타입
interface HistoryState {
  timelineClips: VideoClip[];
  textClips: TextClip[];
  soundClips: SoundClip[];
}

export default function VideoEditorPage() {
  const searchParams = useSearchParams();
  const [projectTitle, setProjectTitle] = useState('Untitled Project');
  const maxTimelineHeight = 220;
  
  // 타임라인 높이 관리 (픽셀 단위)
  const [timelineHeight, setTimelineHeight] = useState(maxTimelineHeight); // 기본 220px
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [initialHeight, setInitialHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 재생 상태 관리
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<PlayerRef | null>(null);
  const prevFrameRef = useRef<number>(0); // 이전 프레임 추적용
  
  // 선택된 텍스트 클립
  const [selectedTextClip, setSelectedTextClip] = useState<string | null>(null);
  
  // 히스토리 관리
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // URL 파라미터에서 프로젝트 제목 읽기
  useEffect(() => {
    const title = searchParams.get('title');
    if (title) {
      setProjectTitle(decodeURIComponent(title));
    }
  }, [searchParams]);
  
  // 타임라인 스케일: 1초당 몇 px로 표시할지 결정
  const PIXELS_PER_SECOND = 40;
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);
  const [showSoundLibrary, setShowSoundLibrary] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [editingTextClip, setEditingTextClip] = useState<TextClip | undefined>(undefined);
  const [timelineClips, setTimelineClips] = useState<VideoClip[]>([]);
  const [textClips, setTextClips] = useState<TextClip[]>([]);
  const [soundClips, setSoundClips] = useState<SoundClip[]>([]);
  
  // 히스토리에 현재 상태 저장
  const saveToHistory = () => {
    const newState: HistoryState = {
      timelineClips: [...timelineClips],
      textClips: [...textClips],
      soundClips: [...soundClips]
    };
    
    // 현재 인덱스 이후의 히스토리 제거 (새로운 분기 생성)
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    // 최대 50개 히스토리 유지
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
  };
  
  // Undo 기능
  const handleUndo = () => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setTimelineClips(previousState.timelineClips);
      setTextClips(previousState.textClips);
      setSoundClips(previousState.soundClips);
      setHistoryIndex(historyIndex - 1);
    }
  };
  
  // Redo 기능
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setTimelineClips(nextState.timelineClips);
      setTextClips(nextState.textClips);
      setSoundClips(nextState.soundClips);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleAddClip = () => {
    setShowVideoLibrary(true);
  };

  const handleAddSound = () => {
    setShowSoundLibrary(true);
  };

  const handleAddText = () => {
    setEditingTextClip(undefined);
    setShowTextEditor(true);
  };

  // 비디오 URL로부터 길이(초)를 읽어오는 헬퍼
  const getVideoDurationSeconds = (url?: string): Promise<number> => {
    return new Promise((resolve) => {
      if (!url) {
        resolve(0);
        return;
      }
      try {
        const videoEl = document.createElement('video');
        videoEl.preload = 'metadata';
        videoEl.src = url;
        const onLoaded = () => {
          const seconds = isFinite(videoEl.duration) ? videoEl.duration : 0;
          cleanup();
          resolve(seconds || 0);
        };
        const onError = () => {
          cleanup();
          resolve(0);
        };
        const cleanup = () => {
          videoEl.removeEventListener('loadedmetadata', onLoaded);
          videoEl.removeEventListener('error', onError);
        };
        videoEl.addEventListener('loadedmetadata', onLoaded);
        videoEl.addEventListener('error', onError);
      } catch {
        resolve(0);
      }
    });
  };

  // URL에서 파일명 또는 식별자 추출해 제목 후보로 사용
  const extractTitleFromUrl = (url?: string): string | null => {
    if (!url) return null;
    try {
      const pathname = new URL(url).pathname;
      const parts = pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (!last) return null;
      // 확장자 제거
      const base = last.split('?')[0].split('#')[0];
      const noExt = base.includes('.') ? base.substring(0, base.lastIndexOf('.')) : base;
      return decodeURIComponent(noExt);
    } catch {
      return null;
    }
  };

  const handleAddToTimeline = async (videos: LibraryVideo[]) => {
    // Import helper functions
    const { getTimelineEnd } = await import('./_utils/timeline-utils');
    
    // 기본 duration을 6초로 설정 (6초 * 40px/초 = 240px)
    const default_px = 240;
    
    // Get the end position of existing clips
    const startPosition = getTimelineEnd(timelineClips);
    
    // 여러 비디오를 한 번에 처리
    let currentPosition = startPosition;
    const newClips = videos.map((video, index) => {
      // 각 비디오마다 고유한 ID 생성
      const clipId = `clip-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newClip: VideoClip = {
        id: clipId,
        duration: default_px,
        position: currentPosition, // Place sequentially
        thumbnails: 1,
        url: video.output_video_url,
        thumbnail: video.input_image_url,
        title: video.selected_effects?.[0]?.name || extractTitleFromUrl(video.output_video_url) || 'Video Clip',
        maxDuration: default_px,
        startTime: 0, // 원본 영상의 시작
        endTime: undefined, // 자동으로 영상 끝까지
      };

      // Update position for next clip
      currentPosition += default_px;

      // 백그라운드에서 실제 duration 계산 후 업데이트
      getVideoDurationSeconds(video.output_video_url).then((duration_seconds) => {
        const min_px = 80;
        const computed_px = Math.max(min_px, Math.round((duration_seconds || 0) * PIXELS_PER_SECOND));
        
        setTimelineClips(prev => {
          // 현재 클립의 인덱스 찾기
          const clipIndex = prev.findIndex(c => c.id === clipId);
          if (clipIndex === -1) return prev;
          
          // 현재 클립의 이전 duration
          const oldDuration = prev[clipIndex].duration;
          const durationDiff = computed_px - oldDuration;
          
          // 클립들 업데이트
          return prev.map((clip, idx) => {
            if (clip.id === clipId) {
              // 현재 클립: duration 업데이트
              return { ...clip, duration: computed_px, maxDuration: computed_px };
            } else if (idx > clipIndex) {
              // 이후 클립들: position 조정 (간격 제거)
              return { ...clip, position: clip.position + durationDiff };
            }
            return clip;
          });
        });
      });

      return newClip;
    });

    // Add all clips
    setTimelineClips([...timelineClips, ...newClips]);
    saveToHistory(); // 히스토리 저장

    setShowVideoLibrary(false);
  };

  // 텍스트 위치 업데이트 (화면에서 드래그)
  const handleUpdateTextPosition = (id: string, x: number, y: number) => {
    setTextClips(prev => prev.map(clip => 
      clip.id === id 
        ? { ...clip, style: { ...clip.style, positionX: x, positionY: y } }
        : clip
    ));
    saveToHistory();
  };

  // 텍스트 크기 업데이트 (화면에서 리사이즈)
  const handleUpdateTextSize = (id: string, fontSize: number) => {
    setTextClips(prev => prev.map(clip => 
      clip.id === id 
        ? { ...clip, style: { ...clip.style, fontSize } }
        : clip
    ));
    saveToHistory();
  };

  const handleAddTextClip = (textData: Partial<TextClip>) => {
    if (editingTextClip) {
      setTextClips(textClips.map(clip => 
        clip.id === editingTextClip.id 
          ? { ...clip, ...textData } 
          : clip
      ));
      saveToHistory(); // 편집도 히스토리 저장
    } else {
      // Import helper functions
      import('./_utils/timeline-utils').then(({ getTimelineEnd }) => {
        const duration = textData.duration || 200;
        
        // Get the end position of existing clips
        const position = getTimelineEnd(textClips);
        
        const newTextClip: TextClip = {
          id: `text-${Date.now()}`,
          content: textData.content || '',
          duration: duration,
          position: textData.position || position,
          style: textData.style || {
            fontSize: 24,
            fontFamily: 'default',
            color: '#FFFFFF',
            alignment: 'center',
          },
          effect: textData.effect,
        };
        
        // Add clip
        setTextClips([...textClips, newTextClip]);
        saveToHistory(); // 히스토리 저장
      });
    }
    setShowTextEditor(false);
    setEditingTextClip(undefined);
  };

  const handleEditTextClip = (clip: TextClip) => {
    setEditingTextClip(clip);
    setShowTextEditor(true);
  };

  const handleDeleteTextClip = (id: string) => {
    // Simple deletion without ripple effect
    setTextClips(textClips.filter(c => c.id !== id));
    saveToHistory(); // 히스토리 저장
  };

  const handleResizeTextClip = (id: string, newDuration: number) => {
    setTextClips(textClips.map(clip => 
      clip.id === id ? { ...clip, duration: newDuration } : clip
    ));
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAddSoundClip = (soundData: Partial<SoundClip>) => {
    const newSoundClip: SoundClip = {
      id: `sound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: soundData.name || 'New Sound',
      duration: soundData.duration || 300,
      position: soundData.position ?? 0, // Default to start of timeline
      volume: soundData.volume || 100,
      url: soundData.url,
      maxDuration: soundData.maxDuration, // Pass through max duration
    };
    setSoundClips([...soundClips, newSoundClip]);
    saveToHistory(); // Save to history after adding
  };

  const handleEditSoundClip = () => {
    // TODO: Implement sound editing modal
  };

  const handleDeleteSoundClip = (id: string) => {
    // Simple deletion without ripple effect
    setSoundClips(soundClips.filter(c => c.id !== id));
    saveToHistory(); // 히스토리 저장
  };

  const handleResizeSoundClip = (id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => {
    setSoundClips(prev => prev.map(clip => {
      if (clip.id !== id) return clip;
      const updates = applyResizeTrim(clip, newDuration, handle, deltaPosition, PIXELS_PER_SECOND);
      return { ...clip, ...updates };
    }));
  };

  const handleReorderVideoClips = (newClips: typeof timelineClips) => {
    setTimelineClips(newClips);
  };

  const handleDeleteVideoClip = (id: string) => {
    // Simple deletion without ripple effect
    setTimelineClips(timelineClips.filter(c => c.id !== id));
    saveToHistory(); // 히스토리 저장
  };

  const handleDuplicateVideoClip = (id: string) => {
    const clip = timelineClips.find(c => c.id === id);
    if (!clip) return;
    
    const duplicatedClip = duplicateVideoClip(clip, timelineClips);
    setTimelineClips([...timelineClips, duplicatedClip]);
    saveToHistory();
  };

  const handleDuplicateTextClip = (id: string) => {
    const clip = textClips.find(c => c.id === id);
    if (!clip) return;
    
    const duplicatedClip = duplicateTextClip(clip, textClips);
    setTextClips([...textClips, duplicatedClip]);
    saveToHistory();
  };

  const handleDuplicateSoundClip = (id: string) => {
    const clip = soundClips.find(c => c.id === id);
    if (!clip) return;
    
    const duplicatedClip = duplicateSoundClip(clip, soundClips);
    setSoundClips([...soundClips, duplicatedClip]);
    saveToHistory();
  };

  const handleSplitVideoClip = (id: string) => {
    const clip = timelineClips.find(c => c.id === id);
    if (!clip) return;
    
    const playheadPosition = currentTime * PIXELS_PER_SECOND;
    const result = splitVideoClip(clip, playheadPosition, PIXELS_PER_SECOND);
    
    if (result) {
      const { firstClip, secondClip } = result;
      setTimelineClips(timelineClips.map(c => 
        c.id === id ? firstClip : c
      ).concat(secondClip));
      saveToHistory();
    }
  };

  const handleSplitTextClip = (id: string) => {
    const clip = textClips.find(c => c.id === id);
    if (!clip) return;
    
    const playheadPosition = currentTime * PIXELS_PER_SECOND;
    const result = splitTextClip(clip, playheadPosition);
    
    if (result) {
      const { firstClip, secondClip } = result;
      setTextClips(textClips.map(c => 
        c.id === id ? firstClip : c
      ).concat(secondClip));
      saveToHistory();
    }
  };

  const handleSplitSoundClip = (id: string) => {
    const clip = soundClips.find(c => c.id === id);
    if (!clip) return;
    
    const playheadPosition = currentTime * PIXELS_PER_SECOND;
    const result = splitSoundClip(clip, playheadPosition, PIXELS_PER_SECOND);
    
    if (result) {
      const { firstClip, secondClip } = result;
      setSoundClips(soundClips.map(c => 
        c.id === id ? firstClip : c
      ).concat(secondClip));
      saveToHistory();
    }
  };

  const handleResizeVideoClip = (id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => {
    setTimelineClips(prev => prev.map(clip => {
      if (clip.id !== id) return clip;
      const updates = applyResizeTrim(clip, newDuration, handle, deltaPosition, PIXELS_PER_SECOND);
      return { ...clip, ...updates };
    }));
  };

  const handleReorderTextClips = (newClips: TextClip[]) => {
    setTextClips(newClips);
  };

  const handleReorderSoundClips = (newClips: SoundClip[]) => {
    setSoundClips(newClips);
  };

  const handleUpdateVideoClipPosition = (id: string, newPosition: number) => {
    setTimelineClips(prev => prev.map(clip => 
      clip.id === id ? { ...clip, position: newPosition } : clip
    ));
    saveToHistory();
  };

  const handleUpdateTextClipPosition = (id: string, newPosition: number) => {
    setTextClips(prev => prev.map(clip => 
      clip.id === id ? { ...clip, position: newPosition } : clip
    ));
    saveToHistory();
  };

  const handleUpdateSoundClipPosition = (id: string, newPosition: number) => {
    setSoundClips(prev => prev.map(clip => 
      clip.id === id ? { ...clip, position: newPosition } : clip
    ));
    saveToHistory();
  };

  // 전체 클립 배열 업데이트 (magnetic positioning용)
  const handleUpdateAllVideoClips = (newClips: VideoClip[]) => {
    setTimelineClips(newClips);
    saveToHistory();
  };

  const handleUpdateAllTextClips = (newClips: TextClip[]) => {
    setTextClips(newClips);
    saveToHistory();
  };

  const handleUpdateAllSoundClips = (newClips: SoundClip[]) => {
    setSoundClips(newClips);
    saveToHistory();
  };

  // 재생 제어 함수들
  const handlePlayPause = () => {
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
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (playerRef.current) {
      const frame = Math.round(time * 30); // 30fps 기준
      playerRef.current.seekTo(frame);
    }
  };

  // Player 상태 폴링으로 시간 업데이트 및 재생 완료 감지
  useEffect(() => {
    if (!isPlaying || !playerRef.current) {
      // 재생이 멈췄을 때 이전 프레임 리셋
      prevFrameRef.current = 0;
      return;
    }
    
    // 총 프레임 계산 (VideoPreview와 동일한 로직)
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

  // 리사이저 드래그 핸들러
  const handleResizerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setDragStartY(e.clientY);
    setInitialHeight(timelineHeight);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // 드래그 시작점 대비 상대적 변화량 계산 (위로 드래그하면 음수)
      const deltaY = dragStartY - e.clientY;
      const newHeight = initialHeight + deltaY;
      
      // 최소 100px (가장 아래), 최대 150px (가장 위 - 기본값)
      const minHeight = 100;
      const maxHeight = maxTimelineHeight;
      
      setTimelineHeight(Math.min(maxHeight, Math.max(minHeight, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
      };
    }
  }, [isResizing, dragStartY, initialHeight]);

  return (
    <div ref={containerRef} className="bg-background text-foreground h-screen overflow-hidden flex flex-col">
      <Header 
        activePage="edit"
        projectTitle={projectTitle}
        onProjectTitleChange={setProjectTitle}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 비디오 프리뷰 영역 - 타임라인 높이에 따라 유동적 */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <VideoPreview 
            clips={timelineClips}
            textClips={textClips}
            soundClips={soundClips}
            onRemoveClip={handleDeleteVideoClip}
            playerRef={playerRef}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onPlayStateChange={setIsPlaying}
            onUpdateTextPosition={handleUpdateTextPosition}
            onUpdateTextSize={handleUpdateTextSize}
            selectedTextClip={selectedTextClip}
            onSelectTextClip={setSelectedTextClip}
          />
        </div>

        {/* 리사이저 바 - 아래로만 드래그 가능 */}
        <div 
          className={`h-1 bg-gray-700 hover:bg-[#38f47cf9] transition-colors relative ${
            isResizing ? 'bg-[#38f47cf9]' : ''
          } ${timelineHeight >= 300 ? 'cursor-s-resize' : 'cursor-ns-resize'}`}
          onMouseDown={handleResizerMouseDown}
          title={timelineHeight >= 300 ? "드래그하여 타임라인 축소" : "드래그하여 타임라인 크기 조정"}
        >
          {/* 리사이저 핸들 아이콘 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col gap-0.5">
              <div className="w-8 h-0.5 bg-gray-500 rounded-full" />
              <div className="w-8 h-0.5 bg-gray-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* 타임라인 영역 - 고정 높이 */}
        <div 
          className="flex-shrink-0 relative"
          style={{ height: `${timelineHeight}px` }}
        >
          <Timeline 
          clips={timelineClips}
          textClips={textClips}
          soundClips={soundClips}
          onAddClip={handleAddClip}
          onAddText={handleAddText}
          onAddSound={handleAddSound}
          onEditTextClip={handleEditTextClip}
          onEditSoundClip={handleEditSoundClip}
          onDeleteTextClip={handleDeleteTextClip}
          onDeleteSoundClip={handleDeleteSoundClip}
          onDeleteVideoClip={handleDeleteVideoClip}
          onDuplicateVideoClip={handleDuplicateVideoClip}
          onDuplicateTextClip={handleDuplicateTextClip}
          onDuplicateSoundClip={handleDuplicateSoundClip}
          onSplitVideoClip={handleSplitVideoClip}
          onSplitTextClip={handleSplitTextClip}
          onSplitSoundClip={handleSplitSoundClip}
          onResizeTextClip={handleResizeTextClip}
          onResizeSoundClip={handleResizeSoundClip}
          onReorderVideoClips={handleReorderVideoClips}
          onReorderTextClips={handleReorderTextClips}
          onReorderSoundClips={handleReorderSoundClips}
          onResizeVideoClip={handleResizeVideoClip}
          onUpdateVideoClipPosition={handleUpdateVideoClipPosition}
          onUpdateTextClipPosition={handleUpdateTextClipPosition}
          onUpdateSoundClipPosition={handleUpdateSoundClipPosition}
          onUpdateAllVideoClips={handleUpdateAllVideoClips}
          onUpdateAllTextClips={handleUpdateAllTextClips}
          onUpdateAllSoundClips={handleUpdateAllSoundClips}
          pixelsPerSecond={PIXELS_PER_SECOND}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onSeek={handleSeek}
          onPlayPause={handlePlayPause}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          />
        </div>
      </div>

      {showVideoLibrary && (
        <VideoLibraryModal
          onClose={() => setShowVideoLibrary(false)}
          onAddToTimeline={handleAddToTimeline}
        />
      )}

      {showSoundLibrary && (
        <SoundLibraryModal
          onClose={() => setShowSoundLibrary(false)}
          onCreateVideo={() => {
            // TODO: Implement create video functionality
            // Create video
          }}
          onSelectSounds={async (sounds) => {
            // Import helper functions
            const { getTimelineEnd } = await import('./_utils/timeline-utils');
            
            // Get the end position of existing clips
            let currentPosition = getTimelineEnd(soundClips);
            
            // 여러 사운드를 한 번에 처리 (handleAddToTimeline과 동일한 패턴)
            const newSoundClips = sounds.map((sound, index) => {
              const durationInPixels = Math.round(sound.duration * PIXELS_PER_SECOND);
              
              const newClip: SoundClip = {
                id: `sound-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
                name: sound.name,
                url: sound.url,
                duration: durationInPixels,
                maxDuration: durationInPixels, // Set max duration to actual audio length
                position: currentPosition,
                volume: 100
              };
              
              // Update position for next clip
              currentPosition += durationInPixels;
              
              return newClip;
            });
            
            // Add all clips at once
            setSoundClips([...soundClips, ...newSoundClips]);
            saveToHistory();
            
            setShowSoundLibrary(false);
          }}
        />
      )}

      {showTextEditor && (
        <TextEditorModal
          isOpen={showTextEditor}
          onClose={() => {
            setShowTextEditor(false);
            setEditingTextClip(undefined);
          }}
          onAddText={handleAddTextClip}
          editingClip={editingTextClip}
        />
      )}
    </div>
  );
}