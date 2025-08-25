'use client';

import { VideoClip as VideoClipType, TextClip as TextClipType, SoundClip as SoundClipType } from '@/shared/types/video-editor';
import VideoClip from './VideoClip';
import TextClip from './TextClip';
import SoundClip from './SoundClip';

interface TimelineTrackProps {
  type: 'video' | 'text' | 'sound';
  clips: (VideoClipType | TextClipType | SoundClipType)[];
  laneIndex?: number; // For sound tracks, indicates which lane this track represents
  selectedClips: string[];
  rectSelectedClips: { id: string; type: 'video' | 'text' | 'sound' }[];
  onClipClick: (clipId: string, clipType: 'video' | 'text' | 'sound') => void;
  onMouseDown: (e: React.MouseEvent, clipId: string, clipType: 'video' | 'text' | 'sound') => void;
  onResizeStart: (e: React.MouseEvent, clipId: string, handle: 'left' | 'right', clipType: 'video' | 'text' | 'sound') => void;
  onEditClip?: (clip: TextClipType | SoundClipType) => void;
  onDeleteClip?: (id: string) => void;
  onVolumeChange?: (id: string, volume: number) => void;
  onFadeChange?: (id: string, fadeType: 'fadeIn' | 'fadeOut', duration: number) => void;
  activeClip?: string | null;
  pixelsPerSecond?: number;
  isSelectingRange?: boolean;
  onTrackClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Timeline track component
 * Renders a single track (video, text, or sound) with its clips
 */
export default function TimelineTrack({
  type,
  clips,
  laneIndex,
  selectedClips,
  rectSelectedClips,
  onClipClick,
  onMouseDown,
  onResizeStart,
  onEditClip,
  onDeleteClip,
  onVolumeChange,
  onFadeChange,
  activeClip,
  pixelsPerSecond = 40,
  isSelectingRange = false,
  onTrackClick,
}: TimelineTrackProps) {
  // 줌 비율 계산 (기준: 40px/초)
  const zoomRatio = pixelsPerSecond / 40;
  
  const renderVideoClip = (clip: VideoClipType) => {
    const isRectSelected = rectSelectedClips.some(c => c.id === clip.id && c.type === 'video');
    const isSelected = selectedClips.includes(clip.id);
    const clipWidth = clip.duration * zoomRatio;
    const isActive = activeClip === clip.id;
    
    return (
      <div 
        key={clip.id}
        data-clip-id={clip.id}
        data-clip-type="video"
        className="group absolute top-0 timeline-clip"
        style={{ 
          width: `${clipWidth}px`,
          left: `${clip.position * zoomRatio}px`
        }}
        onClick={() => onClipClick(clip.id, 'video')}
        onMouseDown={(e) => {
          if (e.shiftKey || isSelectingRange) return;
          if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
            onMouseDown(e, clip.id, 'video');
          }
        }}
      >
        <VideoClip
          clip={clip}
          onResizeStart={(e, handle) => onResizeStart(e, clip.id, handle, 'video')}
          isActive={isActive}
          isSelected={isSelected}
          isRectSelected={isRectSelected}
          clipWidth={clipWidth}
          pixelsPerSecond={pixelsPerSecond}
        />
      </div>
    );
  };

  const renderTextClip = (clip: TextClipType) => {
    const isRectSelected = rectSelectedClips.some(c => c.id === clip.id && c.type === 'text');
    const isSelected = selectedClips.includes(clip.id);
    const clipWidth = clip.duration * zoomRatio;
    
    return (
      <div
        key={clip.id}
        data-clip-id={clip.id}
        data-clip-type="text"
        className={`timeline-clip absolute top-0 ${
          isRectSelected
            ? 'ring-2 ring-red-400 rounded'
            : isSelected
              ? 'ring-2 ring-[#38f47cf9] rounded'
              : ''
        }`}
        style={{ 
          width: `${clipWidth}px`,
          left: `${clip.position * zoomRatio}px`
        }}
        onClick={() => onClipClick(clip.id, 'text')}
        onMouseDown={(e) => {
          if (e.shiftKey || isSelectingRange) return;
          if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
            onMouseDown(e, clip.id, 'text');
          }
        }}
      >
        <TextClip
          clip={clip}
          onEdit={onEditClip}
          onDelete={onDeleteClip}
          onResizeStart={(e, handle) => onResizeStart(e, clip.id, handle, 'text')}
          isActive={activeClip === clip.id}
          clipWidth={clipWidth}
        />
      </div>
    );
  };

  const renderSoundClip = (clip: SoundClipType) => {
    const isRectSelected = rectSelectedClips.some(c => c.id === clip.id && c.type === 'sound');
    const isSelected = selectedClips.includes(clip.id);
    const clipWidth = clip.duration * zoomRatio;
    
    return (
      <div
        key={clip.id}
        data-clip-id={clip.id}
        data-clip-type="sound"
        className={`timeline-clip absolute top-0 ${
          isRectSelected
            ? 'ring-2 ring-red-400 rounded'
            : isSelected
              ? 'ring-2 ring-[#38f47cf9] rounded'
              : ''
        }`}
        style={{ 
          width: `${clipWidth}px`,
          left: `${clip.position * zoomRatio}px`
        }}
        onClick={() => onClipClick(clip.id, 'sound')}
        onMouseDown={(e) => {
          if (e.shiftKey || isSelectingRange) return;
          if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
            onMouseDown(e, clip.id, 'sound');
          }
        }}
      >
        <SoundClip
          clip={clip}
          onEdit={onEditClip}
          onDelete={onDeleteClip}
          onResizeStart={(e, handle) => onResizeStart(e, clip.id, handle, 'sound')}
          onVolumeChange={onVolumeChange}
          onFadeChange={onFadeChange}
          isActive={activeClip === clip.id}
          pixelsPerSecond={pixelsPerSecond}
          clipWidth={clipWidth}
        />
      </div>
    );
  };

  // Track height calculation based on type
  // Video: 32px, Text: 32px, Sound: 48px for waveform display
  const getTrackHeight = () => {
    switch (type) {
      case 'sound':
        return 'h-12'; // 48px for waveform display
      case 'video':
      case 'text':
      default:
        return 'h-8'; // 32px for video and text
    }
  };
  
  const getClipContainerHeight = () => {
    switch (type) {
      case 'sound':
        return 'h-10'; // 40px for sound clips
      case 'video':
      case 'text':
      default:
        return 'h-5'; // 20px for video and text clips
    }
  };

  return (
    <div 
      className={`border-b border-gray-700 ${getTrackHeight()} flex items-center`} 
      onClick={onTrackClick}
      data-lane-id={type === 'sound' ? laneIndex : undefined}
      data-track-type={type}
    >
      <div className={`relative w-full ${getClipContainerHeight()}`}>
        
        {clips.map((clip) => {
          if (type === 'video') return renderVideoClip(clip as VideoClipType);
          if (type === 'text') return renderTextClip(clip as TextClipType);
          if (type === 'sound') return renderSoundClip(clip as SoundClipType);
          return null;
        })}
      </div>
    </div>
  );
}