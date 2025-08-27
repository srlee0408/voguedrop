'use client';

import VideoPreview from './VideoPreview';
import { useClips, usePlayback } from '@/app/video-editor/_context/Providers';

interface PreviewSectionProps {
  projectTitle: string;
  selectedTextClip: string | null;
  onSelectTextClip: (clipId: string | null) => void;
  onRemoveClip: (id: string) => void;
  onUpdateTextPosition: (id: string, x: number, y: number) => void;
  onUpdateTextSize: (id: string, fontSize: number, fontSizeRatio: number) => void;
  onSaveProject?: () => Promise<void>; // 저장 함수 전달
}

export default function PreviewSection({
  projectTitle,
  selectedTextClip,
  onSelectTextClip,
  onRemoveClip,
  onUpdateTextPosition,
  onUpdateTextSize,
  onSaveProject,
}: PreviewSectionProps) {
  const {
    timelineClips,
    textClips,
    soundClips,
  } = useClips();
  
  const {
    currentTime,
    isPlaying,
    playerRef,
    setIsPlaying,
  } = usePlayback();

  // VideoPreview가 기대하는 타입에 맞게 변환
  const handleSelectTextClip = (id: string | null) => {
    onSelectTextClip(id);
  };

  return (
    <div className="w-full h-full overflow-hidden relative">
      <VideoPreview 
        clips={timelineClips}
        textClips={textClips}
        soundClips={soundClips}
        onRemoveClip={onRemoveClip}
        playerRef={playerRef}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onPlayStateChange={setIsPlaying}
        onUpdateTextPosition={onUpdateTextPosition}
        onUpdateTextSize={onUpdateTextSize}
        selectedTextClip={selectedTextClip}
        onSelectTextClip={handleSelectTextClip}
        projectTitle={projectTitle}
        onSaveProject={onSaveProject}
      />
    </div>
  );
}