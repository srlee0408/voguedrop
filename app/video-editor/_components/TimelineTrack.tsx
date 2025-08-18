'use client';

import { VideoClip as VideoClipType, TextClip as TextClipType, SoundClip as SoundClipType } from '@/types/video-editor';
import TextClip from './TextClip';
import SoundClip from './SoundClip';

interface TimelineTrackProps {
  type: 'video' | 'text' | 'sound';
  clips: (VideoClipType | TextClipType | SoundClipType)[];
  selectedClips: string[];
  rectSelectedClips: { id: string; type: 'video' | 'text' | 'sound' }[];
  onClipClick: (clipId: string, clipType: 'video' | 'text' | 'sound') => void;
  onMouseDown: (e: React.MouseEvent, clipId: string, clipType: 'video' | 'text' | 'sound') => void;
  onResizeStart: (e: React.MouseEvent, clipId: string, handle: 'left' | 'right', clipType: 'video' | 'text' | 'sound') => void;
  onEditClip?: (clip: TextClipType | SoundClipType) => void;
  onDeleteClip?: (id: string) => void;
  onVolumeChange?: (id: string, volume: number) => void;
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
  selectedClips,
  rectSelectedClips,
  onClipClick,
  onMouseDown,
  onResizeStart,
  onEditClip,
  onDeleteClip,
  onVolumeChange,
  activeClip,
  pixelsPerSecond = 40,
  isSelectingRange = false,
  onTrackClick,
}: TimelineTrackProps) {
  
  const renderVideoClip = (clip: VideoClipType) => {
    const isRectSelected = rectSelectedClips.some(c => c.id === clip.id && c.type === 'video');
    const isSelected = selectedClips.includes(clip.id);
    
    return (
      <div 
        key={clip.id}
        data-clip-id={clip.id}
        data-clip-type="video"
        className={`group absolute top-0 timeline-clip ${
          isRectSelected
            ? 'ring-2 ring-red-400 rounded'
            : isSelected
              ? 'ring-2 ring-[#38f47cf9] rounded'
              : ''
        }`}
        style={{ 
          width: `${clip.duration}px`,
          left: `${clip.position}px`
        }}
        onClick={() => onClipClick(clip.id, 'video')}
        onMouseDown={(e) => {
          if (e.shiftKey || isSelectingRange) return;
          if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
            onMouseDown(e, clip.id, 'video');
          }
        }}
      >
        <div 
          className="w-full h-5 bg-gradient-to-r from-gray-900 to-gray-800 rounded cursor-pointer hover:from-gray-800 hover:to-gray-700 transition-colors relative overflow-hidden border border-gray-700"
        >
          {/* Title */}
          <div className="absolute inset-0 flex items-center">
            <div className="px-2 py-0.5 text-[10px] font-medium text-white/90 truncate">
              {clip.title || 'Video Clip'}
            </div>
          </div>
          {/* Resize handles */}
          <div 
            className="absolute inset-y-0 left-0 w-1 bg-[#38f47cf9] rounded-l cursor-ew-resize resize-handle"
            onMouseDown={(e) => onResizeStart(e, clip.id, 'left', 'video')}
          />
          <div 
            className="absolute inset-y-0 right-0 w-1 bg-[#38f47cf9] rounded-r cursor-ew-resize resize-handle"
            onMouseDown={(e) => onResizeStart(e, clip.id, 'right', 'video')}
          />
        </div>
      </div>
    );
  };

  const renderTextClip = (clip: TextClipType) => {
    const isRectSelected = rectSelectedClips.some(c => c.id === clip.id && c.type === 'text');
    const isSelected = selectedClips.includes(clip.id);
    
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
          width: `${clip.duration}px`,
          left: `${clip.position}px`
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
        />
      </div>
    );
  };

  const renderSoundClip = (clip: SoundClipType) => {
    const isRectSelected = rectSelectedClips.some(c => c.id === clip.id && c.type === 'sound');
    const isSelected = selectedClips.includes(clip.id);
    
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
          width: `${clip.duration}px`,
          left: `${clip.position}px`
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
          isActive={activeClip === clip.id}
          pixelsPerSecond={pixelsPerSecond}
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
    <div className={`border-b border-gray-700 ${getTrackHeight()} flex items-center`} onClick={onTrackClick}>
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