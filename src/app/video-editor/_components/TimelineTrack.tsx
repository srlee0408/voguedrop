/**
 * TimelineTrack - 타임라인 트랙 컴포넌트 🎵
 * 
 * 📌 주요 역할:
 * 1. 비디오, 텍스트, 사운드 클립들을 타임라인 상에 표시하는 단일 트랙
 * 2. 클립 간 드래그 앤 드롭, 선택, 리사이즈 등의 상호작용 처리
 * 3. 드래그 중 고스트 프리뷰 및 교체 대상 하이라이트 표시
 * 4. 트랙 타입별로 다른 높이와 스타일 적용 (비디오/텍스트: 32px, 사운드: 48px)
 * 
 * 🎯 핵심 특징:
 * - 트랙 타입별 클립 렌더링 (VideoClip, TextClip, SoundClip)
 * - 줌 비율에 따른 클립 크기 및 위치 동적 계산
 * - 선택된 클립들의 다양한 시각적 상태 표시 (선택, 사각 선택, 교체 대상)
 * - 드래그 중 실시간 고스트 프리뷰 및 교체 안내 메시지
 * - 클립별 상호작용 이벤트 처리 (클릭, 드래그, 리사이즈)
 * 
 * 🚧 주의사항:
 * - 각 클립 타입별로 다른 props와 이벤트 핸들러 필요
 * - 드래그 타겟 상태와 고스트 프리뷰 동기화 중요
 * - z-index 레벨 관리로 드래그 중 올바른 시각적 계층 구조 유지
 * - 사운드 트랙은 레인 인덱스로 구분되는 멀티 레인 지원
 */
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
  // 드래그 타겟 레인 하이라이트 및 고스트 프리뷰 표시용
  isDragTarget?: boolean;
  ghostPreview?: { left: number; width: number } | null;
  // 고스트 프리뷰가 겹침으로 인해 교체될 때 안내 문구 표시 여부
  ghostIsReplacing?: boolean;
  // 교체 대상이 될 클립 ID (고스트 하이라이트)
  ghostReplaceTargetId?: string | null;
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
  isDragTarget = false,
  ghostPreview = null,
  ghostIsReplacing = false,
  ghostReplaceTargetId = null,
}: TimelineTrackProps) {
  // 줌 비율 계산 (기준: 40px/초)
  const zoomRatio = pixelsPerSecond / 40;

  
  const renderVideoClip = (clip: VideoClipType) => {
    const isRectSelected = rectSelectedClips.some(c => c.id === clip.id && c.type === 'video');
    const isSelected = selectedClips.includes(clip.id);
    const clipWidth = clip.duration * zoomRatio;
    const isActive = activeClip === clip.id;
    const isGhostReplaceTarget = ghostReplaceTargetId === clip.id;

    return (
      <div 
        key={clip.id}
        data-clip-id={clip.id}
        data-clip-type="video"
        className={`group absolute top-0 timeline-clip ${isGhostReplaceTarget ? 'ring-2 ring-red-400 rounded' : ''}`}
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
    const isGhostReplaceTarget = ghostReplaceTargetId === clip.id;

    
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
              : isGhostReplaceTarget
                ? 'ring-2 ring-red-400 rounded'
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
    const isGhostReplaceTarget = ghostReplaceTargetId === clip.id;

    
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
              : isGhostReplaceTarget
                ? 'ring-2 ring-red-400 rounded'
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
      className={`border-b border-gray-700 ${getTrackHeight()} flex items-center ${isDragTarget ? 'bg-sky-500/10' : ''}`} 
      onClick={onTrackClick}
      data-lane-id={laneIndex}
      data-track-type={type}
    >
      <div 
        className={`relative w-full ${getClipContainerHeight()}`}
        data-clip-area-lane-id={laneIndex}
        data-clip-area-track-type={type}
      >
        {/* 드래그 중 고스트 프리뷰 */}
        {ghostPreview && (
          <div
            className="absolute top-0 h-full border-2 border-dashed border-sky-400/60 bg-sky-400/10 rounded pointer-events-none z-[5]"
            style={{
              left: `${ghostPreview.left * zoomRatio}px`,
              width: `${ghostPreview.width * zoomRatio}px`,
            }}
          />
        )}
        {ghostPreview && ghostIsReplacing && (
          <div
            className="absolute top-0 h-full flex items-center justify-center pointer-events-none z-[6]"
            style={{
              left: `${ghostPreview.left * zoomRatio}px`,
              width: `${ghostPreview.width * zoomRatio}px`,
            }}
          >
            <span className="px-2 py-0.5 text-[10px] rounded bg-red-900/70 text-red-100 border border-red-500/60">
              Drop to replace
            </span>
          </div>
        )}
        
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