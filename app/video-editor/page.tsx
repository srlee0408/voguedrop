'use client';

import { useState } from 'react';
import EditorHeader from './_components/Header';
import VideoPreview from './_components/VideoPreview';
import Timeline from './_components/Timeline';
import ControlBar from './_components/ControlBar';
import VideoLibraryModal from './_components/VideoLibraryModal';
import SoundLibraryModal from './_components/SoundLibraryModal';
import TextEditorModal from './_components/TextEditorModal';
import { TextClip, SoundClip, LibraryVideo } from '@/types/video-editor';

export default function VideoEditorPage() {
  // 타임라인 스케일: 1초당 몇 px로 표시할지 결정
  const PIXELS_PER_SECOND = 40;
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);
  const [showSoundLibrary, setShowSoundLibrary] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [selectedSound, setSelectedSound] = useState('Epic Theme');
  const [editingTextClip, setEditingTextClip] = useState<TextClip | undefined>(undefined);
  const [timelineClips, setTimelineClips] = useState<Array<{
    id: string;
    duration: number;
    thumbnails: number;
    url?: string;
    thumbnail?: string;
    title?: string;
    max_duration_px?: number;
  }>>([]);
  const [textClips, setTextClips] = useState<TextClip[]>([]);
  const [soundClips, setSoundClips] = useState<SoundClip[]>([]);

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

  const handleAddToTimeline = async (video: LibraryVideo) => {
    // 기본 duration을 5초로 설정 (5초 * 40px/초 = 200px)
    const default_px = 200;
    // 고유한 ID 생성 (같은 비디오를 여러 번 추가할 수 있도록)
    const clipId = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 선택한 라이브러리 영상을 타임라인 클립으로 변환
    const newClip = {
      id: clipId,
      duration: default_px,
      thumbnails: 1,
      url: video.output_video_url,
      thumbnail: video.input_image_url,
      title: video.selected_effects?.[0]?.name || extractTitleFromUrl(video.output_video_url) || 'Video Clip',
      max_duration_px: default_px,
    };

    // 타임라인에 클립 추가
    setTimelineClips([...timelineClips, newClip]);

    setShowVideoLibrary(false);

    // 백그라운드에서 실제 duration 계산 후 업데이트
    getVideoDurationSeconds(video.output_video_url).then((duration_seconds) => {
      const min_px = 80;
      const computed_px = Math.max(min_px, Math.round((duration_seconds || 0) * PIXELS_PER_SECOND));
      
      setTimelineClips(prev => prev.map(clip => 
        clip.id === clipId 
          ? { ...clip, duration: computed_px, max_duration_px: computed_px }
          : clip
      ));
    });
  };

  const handleAddTextClip = (textData: Partial<TextClip>) => {
    if (editingTextClip) {
      setTextClips(textClips.map(clip => 
        clip.id === editingTextClip.id 
          ? { ...clip, ...textData } 
          : clip
      ));
    } else {
      const newTextClip: TextClip = {
        id: `text-${Date.now()}`,
        content: textData.content || '',
        duration: textData.duration || 200,
        position: textData.position || 0,
        style: textData.style || {
          fontSize: 24,
          fontFamily: 'default',
          color: '#FFFFFF',
          alignment: 'center',
        },
        effect: textData.effect,
      };
      setTextClips([...textClips, newTextClip]);
    }
    setShowTextEditor(false);
    setEditingTextClip(undefined);
  };

  const handleEditTextClip = (clip: TextClip) => {
    setEditingTextClip(clip);
    setShowTextEditor(true);
  };

  const handleDeleteTextClip = (id: string) => {
    setTextClips(textClips.filter(clip => clip.id !== id));
  };

  const handleResizeTextClip = (id: string, newDuration: number) => {
    setTextClips(textClips.map(clip => 
      clip.id === id ? { ...clip, duration: newDuration } : clip
    ));
  };

  const handleAddSoundClip = (soundData: Partial<SoundClip>) => {
    const newSoundClip: SoundClip = {
      id: `sound-${Date.now()}`,
      name: soundData.name || 'New Sound',
      duration: soundData.duration || 300,
      position: soundData.position || 0,
      volume: soundData.volume || 100,
      url: soundData.url,
    };
    setSoundClips([...soundClips, newSoundClip]);
    setShowSoundLibrary(false);
  };

  const handleEditSoundClip = (clip: SoundClip) => {
    // TODO: Implement sound editing modal
    console.log('Edit sound clip:', clip);
  };

  const handleDeleteSoundClip = (id: string) => {
    setSoundClips(soundClips.filter(clip => clip.id !== id));
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
    setTimelineClips(prev => prev.filter(c => c.id !== id));
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

  return (
    <div className="bg-background text-foreground h-screen overflow-hidden flex flex-col">
      <EditorHeader />
      
      <div className="flex-1 flex overflow-hidden">
        <VideoPreview 
          clips={timelineClips}
          onRemoveClip={handleDeleteVideoClip}
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
          onResizeTextClip={handleResizeTextClip}
          onResizeSoundClip={handleResizeSoundClip}
          onReorderVideoClips={handleReorderVideoClips}
          onReorderTextClips={handleReorderTextClips}
          onReorderSoundClips={handleReorderSoundClips}
          onResizeVideoClip={handleResizeVideoClip}
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
          onSelectSound={(sound) => {
            setSelectedSound(sound);
            handleAddSoundClip({ name: sound, duration: 300, volume: 100 });
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