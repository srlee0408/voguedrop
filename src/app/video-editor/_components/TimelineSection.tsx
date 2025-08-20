'use client';

import Timeline from './Timeline';
import { useClips, usePlayback, useHistory, useProject } from '../_context/Providers';

interface TimelineSectionProps {
  PIXELS_PER_SECOND: number;
  onSplitVideoClip: (id: string) => void;
  onSplitTextClip: (id: string) => void;
  onSplitSoundClip: (id: string) => void;
  onAddText: () => void;
  onEditSoundClip: () => void;
}

export default function TimelineSection({
  PIXELS_PER_SECOND,
  onSplitVideoClip,
  onSplitTextClip,
  onSplitSoundClip,
  onAddText,
  onEditSoundClip,
}: TimelineSectionProps) {
  const { timelineHeight } = useProject();
  
  const {
    timelineClips,
    textClips,
    soundClips,
    handleDeleteVideoClip,
    handleDuplicateVideoClip,
    handleResizeVideoClip,
    handleUpdateVideoClipPosition,
    handleUpdateAllVideoClips,
    handleReorderVideoClips,
    handleEditTextClip,
    handleDeleteTextClip,
    handleDuplicateTextClip,
    handleResizeTextClip,
    handleUpdateTextClipPosition,
    handleUpdateAllTextClips,
    handleReorderTextClips,
    handleDeleteSoundClip,
    handleDuplicateSoundClip,
    handleResizeSoundClip,
    handleUpdateSoundClipPosition,
    handleUpdateAllSoundClips,
    handleReorderSoundClips,
    handleUpdateSoundVolume,
    handleUpdateSoundFade,
  } = useClips();
  
  const {
    currentTime,
    totalDuration,
    isPlaying,
    handlePlayPause,
    handleSeek,
  } = usePlayback();
  
  const {
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
  } = useHistory();

  const {
    handleAddClip,
    handleAddSound,
  } = useProject();

  return (
    <div 
      className="flex-shrink-0 relative"
      style={{ height: `${timelineHeight}px` }}
    >
      <Timeline 
        clips={timelineClips}
        textClips={textClips}
        soundClips={soundClips}
        onAddClip={handleAddClip}
        onAddText={onAddText}
        onAddSound={handleAddSound}
        onEditTextClip={handleEditTextClip}
        onEditSoundClip={onEditSoundClip}
        onDeleteTextClip={handleDeleteTextClip}
        onDeleteSoundClip={handleDeleteSoundClip}
        onDeleteVideoClip={handleDeleteVideoClip}
        onDuplicateVideoClip={handleDuplicateVideoClip}
        onDuplicateTextClip={handleDuplicateTextClip}
        onDuplicateSoundClip={handleDuplicateSoundClip}
        onSplitVideoClip={onSplitVideoClip}
        onSplitTextClip={onSplitTextClip}
        onSplitSoundClip={onSplitSoundClip}
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
        onUpdateSoundVolume={handleUpdateSoundVolume}
        onUpdateSoundFade={handleUpdateSoundFade}
        pixelsPerSecond={PIXELS_PER_SECOND}
        currentTime={currentTime}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        onSeek={handleSeek}
        onPlayPause={handlePlayPause}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
    </div>
  );
}