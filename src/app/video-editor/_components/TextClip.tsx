/**
 * TextClip - 텍스트 클립 컴포넌트 📝
 * 
 * 📌 주요 역할:
 * 1. 타임라인에서 텍스트 클립의 시각적 표현 및 편집 인터페이스
 * 2. 더블클릭으로 텍스트 편집 모달 열기 기능
 * 3. 텍스트 내용 미리보기 및 스타일 정보 표시
 * 4. 클립 길이 조절을 위한 리사이즈 핸들 제공
 * 
 * 🎯 핵심 특징:
 * - 텍스트 내용과 폰트 정보를 컴팩트하게 표시
 * - 더블클릭 시 텍스트 편집기 모달 실행
 * - 좌우 리사이즈 핸들로 표시 시간 조절
 * - 활성화 상태에서 하이라이트 표시
 * - 텍스트 오버플로우 시 생략 표시
 * 
 * 🚧 주의사항:
 * - 더블클릭과 단순 클릭 이벤트 충돌 방지 필요
 * - 텍스트 내용이 긴 경우 말줄임표로 처리
 * - 리사이즈 핸들 영역과 텍스트 영역 분리
 */
'use client';

import { useRef } from 'react';
import { TextClip as TextClipType } from '@/shared/types/video-editor';

interface TextClipProps {
  clip: TextClipType;
  onEdit?: (clip: TextClipType) => void;
  onDelete?: (id: string) => void;
  onResizeStart?: (e: React.MouseEvent, handle: 'left' | 'right') => void;
  isActive?: boolean;
  clipWidth?: number;
}

export default function TextClip({
  clip,
  onEdit,
  onResizeStart,
  isActive = false,
  clipWidth = 100,
}: TextClipProps) {
  const clipRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(clip);
    }
  };

  const getEffectClass = () => {
    switch (clip.effect) {
      case 'pulse': return 'animate-pulse';
      case 'bounce': return 'animate-bounce';
      case 'spin': return 'animate-spin';
      default: return '';
    }
  };

  const getEffectStyle = () => {
    if (clip.effect === 'gradient') {
      return {
        background: 'linear-gradient(45deg, #38f47c, #3b82f6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      };
    }
    if (clip.effect === 'glow') {
      return {
        textShadow: '0 0 10px rgba(56, 244, 124, 0.8)',
      };
    }
    return {};
  };

  const showText = clipWidth > 30; // 30px 이하면 텍스트 숨김
  const showIcon = clipWidth > 20; // 20px 이하면 아이콘도 숨김

  return (
    <div
      ref={clipRef}
      className={`group relative w-full h-full select-none ${isActive ? 'z-10' : ''}`}
      onDoubleClick={handleDoubleClick}
    >
      <div className={`w-full h-5 bg-purple-900/50 backdrop-blur-sm rounded cursor-pointer hover:bg-purple-900/60 transition-colors ${
        isActive ? 'ring-2 ring-[#38f47cf9]' : ''
      }`}>
        <div className="absolute inset-0 flex items-center px-1 overflow-hidden">
          {showIcon && (
            <div className="flex items-center gap-1 w-full">
              <i className="ri-text text-[10px] text-purple-300 flex-shrink-0"></i>
              {showText && (
                <span 
                  className={`text-[10px] text-white truncate ${getEffectClass()}`}
                  style={{
                    ...getEffectStyle(),
                    color: clip.effect === 'gradient' ? undefined : clip.style.color,
                  }}
                >
                  {clip.content}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Resize handles - 줌 레벨에 따라 크기 조정 */}
        <div
          className={`absolute inset-y-0 left-0 bg-purple-500 rounded-l cursor-ew-resize resize-handle ${
            clipWidth < 50 ? 'w-0.5' : 'w-1'
          }`}
          onMouseDown={(e) => onResizeStart?.(e, 'left')}
        />
        <div
          className={`absolute inset-y-0 right-0 bg-purple-500 rounded-r cursor-ew-resize resize-handle ${
            clipWidth < 50 ? 'w-0.5' : 'w-1'
          }`}
          onMouseDown={(e) => onResizeStart?.(e, 'right')}
        />
      </div>
    </div>
  );
}