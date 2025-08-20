'use client';

import Image from 'next/image';
import { VideoClip } from '@/shared/types/video-editor';

interface VideoClipSelectorProps {
  clips: VideoClip[];
  selectedClipId: string | null;
  onSelectClip: (clipId: string | null) => void;
  disabled?: boolean;
}

export function VideoClipSelector({ 
  clips, 
  selectedClipId, 
  onSelectClip,
  disabled = false 
}: VideoClipSelectorProps) {
  
  // Helper function to check if a clip is AI-generated
  const isAIGeneratedClip = (clip: VideoClip): boolean => {
    // Check sourceType first (most reliable)
    if (clip.sourceType) {
      return clip.sourceType === 'clip';
    }
    
    // Fallback: check if clip ID contains job_id pattern
    return clip.id.includes('job_') || clip.id.startsWith('clip-job_');
  };
  
  // Filter clips to separate selectable and non-selectable
  const selectableClips = clips.filter(isAIGeneratedClip);
  const hasNonAIClips = clips.some(clip => !isAIGeneratedClip(clip));
  
  if (clips.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <i className="ri-video-line text-3xl mb-2 opacity-50"></i>
        <p className="text-sm">No video clips in timeline</p>
        <p className="text-xs text-gray-600 mt-1">
          Add video clips to your timeline first
        </p>
      </div>
    );
  }
  
  if (selectableClips.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <i className="ri-information-line text-3xl mb-2 opacity-50"></i>
        <p className="text-sm">No AI-generated clips available</p>
        <p className="text-xs text-gray-600 mt-1">
          Only AI-generated clips can be used to create matching soundtracks.
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Add clips from the Canvas AI Studio to generate music.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-400 mb-2">
        Select an AI-generated video clip to create matching soundtrack:
        {hasNonAIClips && (
          <span className="text-xs text-gray-500 ml-2">
            (Non-AI clips cannot generate music)
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
        {clips.map((clip, index) => {
          const isAIClip = isAIGeneratedClip(clip);
          const isSelectable = isAIClip && !disabled;
          
          return (
            <div
              key={clip.id}
              onClick={() => isSelectable && onSelectClip(clip.id)}
              className={`
                relative cursor-pointer rounded-lg overflow-hidden
                border-2 transition-all
                ${selectedClipId === clip.id 
                  ? 'border-primary ring-2 ring-primary/30' 
                  : isAIClip 
                    ? 'border-gray-700 hover:border-gray-600'
                    : 'border-gray-800 cursor-not-allowed'
                }
                ${!isSelectable ? 'opacity-60' : ''}
              `}
            >
              {/* 썸네일 */}
              <div className="aspect-video bg-gray-800 relative">
                {clip.thumbnail ? (
                  <Image
                    src={clip.thumbnail}
                    alt={`Clip ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 800px) 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <i className="ri-video-fill text-2xl text-gray-600"></i>
                  </div>
                )}
                
                {/* Non-AI clip overlay */}
                {!isAIClip && (
                  <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center px-2">
                      <i className="ri-lock-line text-xl text-gray-400 mb-1"></i>
                      <div className="text-xs text-gray-400 font-medium">
                        Not AI clip
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Only AI clips
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 선택 인디케이터 */}
                {selectedClipId === clip.id && isAIClip && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="bg-primary rounded-full p-1">
                      <i className="ri-check-line text-black text-lg"></i>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 클립 정보 */}
              <div className="p-2 bg-gray-900">
                <div className="flex items-center gap-1">
                  {/* Source type badge */}
                  <div className={`
                    inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium
                    ${isAIClip 
                      ? 'bg-primary/20 text-primary' 
                      : clip.sourceType === 'upload'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }
                  `}>
                    {isAIClip ? 'AI' : clip.sourceType === 'upload' ? 'Upload' : 'Project'}
                  </div>
                  <div className="text-xs font-medium truncate flex-1">
                    {clip.title || `Clip ${index + 1}`}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatDuration(clip.duration)}
                </div>
              </div>
              
              {/* 라디오 버튼 (AI 클립만 표시) */}
              {isAIClip && (
                <div className="absolute top-2 right-2">
                  <input
                    type="radio"
                    name="video-clip-selection"
                    checked={selectedClipId === clip.id}
                    onChange={() => onSelectClip(clip.id)}
                    disabled={!isSelectable}
                    className="w-4 h-4 text-primary bg-gray-700 border-gray-600 focus:ring-primary focus:ring-offset-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {selectedClipId && (
        <div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <i className="ri-information-line text-primary"></i>
            <span className="text-gray-300">
              AI soundtrack will be generated based on the selected video&apos;s visual content
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// 시간 포맷 헬퍼 함수
function formatDuration(durationInPixels: number, pixelsPerSecond: number = 40): string {
  const seconds = Math.floor(durationInPixels / pixelsPerSecond);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}