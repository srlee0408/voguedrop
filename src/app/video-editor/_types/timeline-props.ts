import { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';

/**
 * Grouped timeline props for better organization
 */

// Clip data props
export interface TimelineClipsProps {
  clips: VideoClip[];
  textClips: TextClip[];
  soundClips: SoundClip[];
}

// Clip manipulation callbacks
export interface TimelineClipCallbacks {
  // Add callbacks
  onAddClip: () => void;
  onAddText?: () => void;
  onAddSound?: () => void;
  
  // Edit callbacks
  onEditTextClip?: (clip: TextClip) => void;
  onEditSoundClip?: (clip: SoundClip) => void;
  
  // Delete callbacks
  onDeleteVideoClip?: (id: string) => void;
  onDeleteTextClip?: (id: string) => void;
  onDeleteSoundClip?: (id: string) => void;
  
  // Duplicate callbacks
  onDuplicateVideoClip?: (id: string) => void;
  onDuplicateTextClip?: (id: string) => void;
  onDuplicateSoundClip?: (id: string) => void;
  
  // Split callbacks
  onSplitVideoClip?: (id: string) => void;
  onSplitTextClip?: (id: string) => void;
  onSplitSoundClip?: (id: string) => void;
  
  // Resize callbacks
  onResizeVideoClip?: (id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => void;
  onResizeTextClip?: (id: string, newDuration: number) => void;
  onResizeSoundClip?: (id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => void;
  
  // Position update callbacks
  onUpdateVideoClipPosition?: (id: string, newPosition: number) => void;
  onUpdateTextClipPosition?: (id: string, newPosition: number) => void;
  onUpdateSoundClipPosition?: (id: string, newPosition: number) => void;
  
  // Batch update callbacks
  onUpdateAllVideoClips?: (clips: VideoClip[]) => void;
  onUpdateAllTextClips?: (clips: TextClip[]) => void;
  onUpdateAllSoundClips?: (clips: SoundClip[]) => void;
  
  // Legacy reorder callbacks (may be deprecated)
  onReorderVideoClips?: (clips: VideoClip[]) => void;
  onReorderTextClips?: (clips: TextClip[]) => void;
  onReorderSoundClips?: (clips: SoundClip[]) => void;
}

// Playback control props
export interface TimelinePlaybackProps {
  currentTime?: number; // in seconds
  isPlaying?: boolean;
  onSeek?: (time: number) => void;
  onPlayPause?: () => void;
}

// History control props
export interface TimelineHistoryProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

// Configuration props
export interface TimelineConfigProps {
  pixelsPerSecond?: number;
}

// Combined Timeline Props
export interface TimelineProps {
  clips: TimelineClipsProps;
  callbacks: TimelineClipCallbacks;
  playback?: TimelinePlaybackProps;
  history?: TimelineHistoryProps;
  config?: TimelineConfigProps;
}