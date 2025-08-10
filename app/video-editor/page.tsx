'use client';

import { useState, useEffect, useRef } from 'react';
import { PlayerRef } from '@remotion/player';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import VideoPreview from './_components/VideoPreview';
import Timeline from './_components/Timeline';
import ControlBar from './_components/ControlBar';
import VideoLibraryModal from './_components/VideoLibraryModal';
import SoundLibraryModal from './_components/SoundLibraryModal';
import TextEditorModal from './_components/TextEditorModal';
import { VideoClip, TextClip, SoundClip, LibraryVideo } from '@/types/video-editor';

// 히스토리 상태 타입
interface HistoryState {
  timelineClips: VideoClip[];
  textClips: TextClip[];
  soundClips: SoundClip[];
}

export default function VideoEditorPage() {
  const searchParams = useSearchParams();
  const [projectTitle, setProjectTitle] = useState('Untitled Project');
  
  // 재생 상태 관리
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<PlayerRef | null>(null);
  
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
  const [selectedSound, setSelectedSound] = useState('Epic Theme');
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
      };

      // Update position for next clip
      currentPosition += default_px;

      // 백그라운드에서 실제 duration 계산 후 업데이트
      getVideoDurationSeconds(video.output_video_url).then((duration_seconds) => {
        const min_px = 80;
        const computed_px = Math.max(min_px, Math.round((duration_seconds || 0) * PIXELS_PER_SECOND));
        
        setTimelineClips(prev => prev.map(clip => 
          clip.id === clipId 
            ? { ...clip, duration: computed_px, maxDuration: computed_px }
            : clip
        ));
      });

      return newClip;
    });

    // Add all clips
    setTimelineClips([...timelineClips, ...newClips]);
    saveToHistory(); // 히스토리 저장

    setShowVideoLibrary(false);
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

  const handleEditSoundClip = (clip: SoundClip) => {
    // TODO: Implement sound editing modal
    console.log('Edit sound clip:', clip);
  };

  const handleDeleteSoundClip = (id: string) => {
    // Simple deletion without ripple effect
    setSoundClips(soundClips.filter(c => c.id !== id));
    saveToHistory(); // 히스토리 저장
  };

  const handleResizeSoundClip = (id: string, newDuration: number) => {
    setSoundClips(soundClips.map(clip => 
      clip.id === id ? { ...clip, duration: newDuration } : clip
    ));
  };

  const handleReorderVideoClips = (newClips: typeof timelineClips) => {
    setTimelineClips(newClips);
  };

  const handleDeleteVideoClip = (id: string) => {
    // Simple deletion without ripple effect
    setTimelineClips(timelineClips.filter(c => c.id !== id));
    saveToHistory(); // 히스토리 저장
  };

  const handleResizeVideoClip = (id: string, newDuration: number) => {
    setTimelineClips(prev => prev.map(c => c.id === id ? { ...c, duration: newDuration } : c));
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

  // 재생 제어 함수들
  const handlePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
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

  // Player 상태 폴링으로 시간 업데이트
  useEffect(() => {
    if (!isPlaying || !playerRef.current) return;
    
    const interval = setInterval(() => {
      if (playerRef.current) {
        const frame = playerRef.current.getCurrentFrame();
        const time = frame / 30; // 30fps 기준
        setCurrentTime(time);
      }
    }, 100); // 100ms마다 업데이트
    
    return () => clearInterval(interval);
  }, [isPlaying]);


  return (
    <div className="bg-background text-foreground h-screen overflow-hidden flex flex-col">
      <Header 
        activePage="edit"
        projectTitle={projectTitle}
        onProjectTitleChange={setProjectTitle}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <VideoPreview 
          clips={timelineClips}
          textClips={textClips}
          soundClips={soundClips}
          onRemoveClip={handleDeleteVideoClip}
          playerRef={playerRef}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onPlayStateChange={setIsPlaying}
        />
      </div>

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
          onResizeTextClip={handleResizeTextClip}
          onResizeSoundClip={handleResizeSoundClip}
          onReorderVideoClips={handleReorderVideoClips}
          onReorderTextClips={handleReorderTextClips}
          onReorderSoundClips={handleReorderSoundClips}
          onResizeVideoClip={handleResizeVideoClip}
          onUpdateVideoClipPosition={handleUpdateVideoClipPosition}
          onUpdateTextClipPosition={handleUpdateTextClipPosition}
          onUpdateSoundClipPosition={handleUpdateSoundClipPosition}
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

      <ControlBar 
        selectedSound={selectedSound}
        onSelectSound={setSelectedSound}
        onAddSound={handleAddSound}
      />

      {showVideoLibrary && (
        <VideoLibraryModal
          onClose={() => setShowVideoLibrary(false)}
          onAddToTimeline={handleAddToTimeline}
        />
      )}

      {showSoundLibrary && (
        <SoundLibraryModal
          onClose={() => setShowSoundLibrary(false)}
          onSelectSounds={async (sounds) => {
            // Import helper functions
            const { getTimelineEnd } = await import('./_utils/timeline-utils');
            
            // Get the end position of existing clips
            let currentPosition = getTimelineEnd(soundClips);
            
            // Add sounds sequentially
            sounds.forEach((sound) => {
              const durationInPixels = Math.round(sound.duration * PIXELS_PER_SECOND);
              
              handleAddSoundClip({ 
                name: sound.name, 
                url: sound.url,
                duration: durationInPixels,
                maxDuration: durationInPixels, // Set max duration to actual audio length
                position: currentPosition,
                volume: 100 
              });
              
              // Update position for next sound
              currentPosition += durationInPixels;
            });
            
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