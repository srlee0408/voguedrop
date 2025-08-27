/**
 * VideoClip - 비디오 클립 컴포넌트 🎥
 * 
 * 📌 주요 역할:
 * 1. 타임라인에서 개별 비디오 클립의 시각적 표현 및 상호작용
 * 2. 클립 썸네일 표시 및 메타데이터 정보 제공
 * 3. 양쪽 끝에 리사이즈 핸들 제공으로 클립 길이 조절 기능
 * 4. 선택/활성화 상태에 따른 다양한 시각적 피드백
 * 
 * 🎯 핵심 특징:
 * - 비디오 썸네일과 파일명 표시로 직관적인 식별
 * - 좌우 리사이즈 핸들로 클립 트림 기능 지원
 * - 선택, 사각 선택, 활성화 상태별 다른 스타일링
 * - 줌 레벨에 따른 동적 크기 조절
 * - 드래그 앤 드롭을 위한 이벤트 처리
 * 
 * 🚧 주의사항:
 * - 클립 길이는 duration * pixelsPerSecond로 계산
 * - 리사이즈 핸들은 클립 양 끝 5px 영역에만 표시
 * - 상위 컴포넌트에서 선택 상태와 이벤트 처리 관리
 */
'use client';

import { VideoClip as VideoClipType } from '@/shared/types/video-editor';

interface VideoClipProps {
  clip: VideoClipType;
  onResizeStart?: (e: React.MouseEvent, handle: 'left' | 'right') => void;
  isActive?: boolean;
  isSelected?: boolean;
  isRectSelected?: boolean;
  clipWidth?: number;
  pixelsPerSecond?: number;
}

/**
 * 비디오 클립 컴포넌트
 * 타임라인에서 비디오 클립을 렌더링하고 리사이즈 핸들을 제공합니다.
 */
export default function VideoClip({
  clip,
  onResizeStart,
  isActive = false,
  isSelected = false,
  isRectSelected = false,
  clipWidth = 200,
  pixelsPerSecond = 40,
}: VideoClipProps) {
  
  // 줌 비율 계산 (기준: 40px/초)
  const zoomRatio = pixelsPerSecond / 40;
  const actualClipWidth = clipWidth || clip.duration * zoomRatio;
  const showText = actualClipWidth > 30; // 30px 이하면 텍스트 숨김

  return (
    <div className={`group relative w-full h-full select-none ${isActive ? 'z-10' : ''}`}>
      <div 
        className={`w-full h-5 bg-gradient-to-r from-gray-900 to-gray-800 rounded cursor-pointer hover:from-gray-800 hover:to-gray-700 transition-colors relative overflow-hidden border border-gray-700 ${
          isRectSelected
            ? 'ring-2 ring-red-400'
            : isSelected
              ? 'ring-2 ring-[#38f47cf9]'
              : ''
        }`}
      >
        {/* Title - 작을 때는 숨김 */}
        {showText && (
          <div className="absolute inset-0 flex items-center">
            <div className="px-2 py-0.5 text-[10px] font-medium text-white/90 truncate">
              {clip.title || 'Video Clip'}
            </div>
          </div>
        )}
        
        {/* Resize handles - 줌 레벨에 따라 크기 조정 */}
        <div 
          className={`absolute inset-y-0 left-0 bg-[#38f47cf9] rounded-l cursor-ew-resize resize-handle ${
            actualClipWidth < 50 ? 'w-0.5' : 'w-1'
          }`}
          onMouseDown={(e) => onResizeStart?.(e, 'left')}
        />
        <div 
          className={`absolute inset-y-0 right-0 bg-[#38f47cf9] rounded-r cursor-ew-resize resize-handle ${
            actualClipWidth < 50 ? 'w-0.5' : 'w-1'
          }`}
          onMouseDown={(e) => onResizeStart?.(e, 'right')}
        />
      </div>
    </div>
  );
}
