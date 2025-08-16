'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { TextClip as TextClipType } from '@/types/video-editor';
import { TEXT_DEFAULTS, TEXT_PADDING, TEXT_POSITION_PRESETS, ratioToPixels, pixelsToRatio } from '../../../constants/text-editor';

interface TextOverlayEditorProps {
  textClips: TextClipType[];
  containerWidth: number;
  containerHeight: number;
  currentTime: number;
  pixelsPerSecond: number;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateSize: (id: string, fontSize: number, fontSizeRatio: number) => void;
  selectedClip: string | null;
  onSelectClip: (id: string | null) => void;
  aspectRatio?: string;
}


export default function TextOverlayEditor({
  textClips,
  containerWidth,
  containerHeight,
  currentTime,
  pixelsPerSecond,
  onUpdatePosition,
  onUpdateSize,
  selectedClip,
  onSelectClip,
  aspectRatio
}: TextOverlayEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggedClip, setDraggedClip] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showGuides, setShowGuides] = useState(false);
  const [resizingClip, setResizingClip] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ y: 0, size: 0 });
  const [, setForceUpdate] = useState(0);

  // DOM 크기 기반 스케일 계산 (원본 해상도 대비 표시 배율)
  const getScale = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect && containerWidth && containerHeight) {
      const scaleX = rect.width / containerWidth;
      const scaleY = rect.height / containerHeight;
      const scale = Math.min(scaleX, scaleY);
      // 비율 변경 시 더 정확한 스케일 계산을 위한 로직
      if (aspectRatio) {
        // 컨테이너가 실제로 리렌더링된 후의 크기를 사용
        return scale;
      }
      return scale;
    }
    return 1;
  }, [containerWidth, containerHeight, aspectRatio]);

  // 현재 시간에 활성화된 텍스트 클립만 필터링
  const getActiveTextClips = () => {
    const currentFrame = currentTime * 30; // 30fps
    return textClips.filter(clip => {
      const startFrame = (clip.position / pixelsPerSecond) * 30;
      const endFrame = ((clip.position + clip.duration) / pixelsPerSecond) * 30;
      return currentFrame >= startFrame && currentFrame < endFrame;
    });
  };

  const activeClips = getActiveTextClips();

  const getContainerSize = useCallback(() => {
    return { width: containerWidth || 1080, height: containerHeight || 1920 };
  }, [containerWidth, containerHeight]);
  
  // Remotion Player와 동일한 스케일을 사용하기 위해 getScale만 사용
  // (별도 제한/클램핑 없이 실제 표시 배율 그대로 적용)


  const percentToPixel = (percent: number | undefined, max: number, defaultPercent: number = 50): number => {
    const p = percent ?? defaultPercent;
    return (p / 100) * max;
  };

  const pixelToPercent = (pixel: number, max: number): number => {
    return (pixel / max) * 100;
  };

  // 단순화된 텍스트 크기 측정 함수 - 원본 크기로 측정 (최대 너비 80% 적용)
  const measureTextSizeSimple = useCallback((text: string, fontSize: number, fontSizeRatio: number | undefined, fontFamily: string, fontWeight: string) => {
    // 상대적 크기 계산 (비율 우선 사용)
    const containerSize = getContainerSize();
    const actualFontSize = (() => {
      if (fontSizeRatio !== undefined) {
        return ratioToPixels(fontSizeRatio, containerSize.width);
      }
      // 기존 fontSize를 비율로 변환 (1080px 기준)
      const baseWidth = 1080;
      const ratio = pixelsToRatio(fontSize, baseWidth);
      return ratioToPixels(ratio, containerSize.width);
    })();
    const scaledFontSize = actualFontSize; // 스케일 미적용
    const aspectRatio = containerSize.width / containerSize.height;
    
    // DOM 측정만 사용 (더 정확함)
    const tempElement = document.createElement('div');
    tempElement.style.position = 'absolute';
    tempElement.style.left = '-9999px';
    tempElement.style.top = '-9999px';
    tempElement.style.fontSize = `${scaledFontSize}px`;
    tempElement.style.fontFamily = fontFamily;
    tempElement.style.fontWeight = fontWeight;
    tempElement.style.lineHeight = '1.2';
    // Remotion의 기본 흐름과 동일하게 공백을 접고 자동 줄바꿈되도록 설정
    tempElement.style.whiteSpace = 'normal';
    // Remotion 텍스트 컨테이너와 동일한 최대 너비 제한을 적용해 실제 줄바꿈을 반영
    tempElement.style.maxWidth = `${containerSize.width * TEXT_DEFAULTS.maxWidthRatio}px`;
    tempElement.style.visibility = 'hidden';
    tempElement.style.pointerEvents = 'none';
    tempElement.textContent = text;
    
    document.body.appendChild(tempElement);
    const rect = tempElement.getBoundingClientRect();
    const width = rect.width; // 보정 없이 그대로 사용
    const height = rect.height;
    document.body.removeChild(tempElement);
    
    // 빈 텍스트 처리
    const finalWidth = width || scaledFontSize * 0.5;
    const finalHeight = height || scaledFontSize * 1.2;
    
    return {
      width: finalWidth,
      height: finalHeight,
      scaledFontSize,
      aspectRatio
    };
  }, [getContainerSize]);

  const handleMouseDown = (e: React.MouseEvent, clipId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const clip = textClips.find(c => c.id === clipId);
    if (!clip) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const size = getContainerSize();
    const scale = getScale();
    
    // 현재 텍스트의 실제 위치 계산
    const has_custom_position = clip.style?.positionX !== undefined && clip.style?.positionY !== undefined;
    let anchorX = 0;
    let anchorY = 0;
    // 기본 앵커 위치 계산 (정렬에 따라 좌/중/우 기준이 달라짐)
    if (has_custom_position) {
      // 커스텀 위치는 항상 중앙 앵커로 저장/해석됨
      anchorX = percentToPixel(clip.style?.positionX, size.width);
      anchorY = percentToPixel(clip.style?.positionY, size.height);
    } else {
      const vertical = clip.style?.verticalPosition || 'middle';
      const align = clip.style?.alignment || 'center';
      const top_percent = TEXT_POSITION_PRESETS.vertical[vertical as keyof typeof TEXT_POSITION_PRESETS.vertical];
      const left_percent = TEXT_POSITION_PRESETS.horizontal[align as keyof typeof TEXT_POSITION_PRESETS.horizontal];
      anchorX = percentToPixel(left_percent, size.width);
      anchorY = percentToPixel(top_percent, size.height);
    }

    // 중앙 앵커로 변환: Remotion은 커스텀 좌표를 항상 중앙 기준으로 해석하므로
    // 좌/우 정렬로 기본 위치한 요소를 드래그 시작 시 중앙 기준으로 전환해 저장되도록 보정한다.
    // 텍스트 박스 전체 너비(패딩 포함)를 구해 좌/우 정렬 시 중앙 이동량을 반영한다.
    const actualFontSize = clip.style?.fontSize || TEXT_DEFAULTS.fontSize;
    const fontSizeRatio = clip.style?.fontSizeRatio;
    const fontFamily = clip.style?.fontFamily || TEXT_DEFAULTS.fontFamily;
    const fontWeight = clip.style?.fontWeight || TEXT_DEFAULTS.fontWeight;
    const hasBackground = !!clip.style?.backgroundColor;
    const measurement = measureTextSizeSimple(
      clip.content,
      actualFontSize,
      fontSizeRatio,
      fontFamily,
      fontWeight
    );
    const contentWidth = measurement.width; // 컴포지션 좌표계(px)
    const fullBoxWidth = contentWidth + (hasBackground ? TEXT_PADDING.horizontal * 2 : 0); // 좌/우 패딩 포함

    if (!has_custom_position) {
      const align = clip.style?.alignment || 'center';
      if (align === 'left') {
        // 좌측 정렬은 왼쪽 모서리 기준 → 중앙 기준으로 이동
        anchorX = anchorX + fullBoxWidth / 2;
      } else if (align === 'right') {
        // 우측 정렬은 오른쪽 모서리 기준 → 중앙 기준으로 이동
        anchorX = anchorX - fullBoxWidth / 2;
      }
    }
    
    // 마우스 클릭 위치와 텍스트 중심 간의 오프셋 계산
    const mouseX = (e.clientX - rect.left) / scale;
    const mouseY = (e.clientY - rect.top) / scale;
    
    setDraggedClip(clipId);
    setDragOffset({
      x: mouseX - anchorX,
      y: mouseY - anchorY
    });
    setShowGuides(true);
    onSelectClip(clipId);
  };

  const handleResizeStart = (e: React.MouseEvent, clipId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const clip = textClips.find(c => c.id === clipId);
    if (!clip) return;
    
    // fontSizeRatio가 있으면 1080px 기준으로 변환, 없으면 fontSize 사용
    const initialSize = clip.style?.fontSizeRatio 
      ? Math.round(clip.style.fontSizeRatio * 1080)
      : (clip.style?.fontSize || TEXT_DEFAULTS.fontSize);
    
    setResizingClip(clipId);
    setResizeStart({
      y: e.clientY,
      size: initialSize
    });
    onSelectClip(clipId);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggedClip) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const clip = textClips.find(c => c.id === draggedClip);
        if (!clip) return;

        const size = getContainerSize();
        const scale = getScale();
        
        // 마우스 위치에서 오프셋을 뺀 값으로 텍스트 중심 위치 계산
        const mouseX = (e.clientX - rect.left) / scale;
        const mouseY = (e.clientY - rect.top) / scale;
        
        const centerX = mouseX - dragOffset.x; // 항상 중앙 앵커 기준
        const centerY = mouseY - dragOffset.y; // 항상 중앙 앵커 기준
        
        const xPercent = pixelToPercent(centerX, size.width);
        const yPercent = pixelToPercent(centerY, size.height);
        
        onUpdatePosition(draggedClip, xPercent, yPercent);
      } else if (resizingClip) {
        const deltaY = e.clientY - resizeStart.y;
        const newSize = Math.round(Math.max(16, Math.min(200, resizeStart.size + deltaY / 2)));
        // fontSize와 fontSizeRatio를 모두 계산하여 전달 (1080px 기준)
        const newRatio = newSize / 1080; // TextEditorModal과 동일한 1080px 기준
        onUpdateSize(resizingClip, newSize, newRatio);
      }
    };

    const handleMouseUp = () => {
      setDraggedClip(null);
      setResizingClip(null);
      setShowGuides(false);
    };

    if (draggedClip || resizingClip) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedClip, resizingClip, dragOffset, resizeStart, textClips, getContainerSize, getScale, onUpdatePosition, onUpdateSize]);

  // 비율 변경 시 강제 리렌더링
  useEffect(() => {
    // aspectRatio 또는 container 크기가 변경되면 DOM이 업데이트될 때까지 대기 후 리렌더링
    requestAnimationFrame(() => {
      setForceUpdate(prev => prev + 1);
    });
  }, [aspectRatio, containerWidth, containerHeight]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onSelectClip(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onSelectClip]);

  if (activeClips.length === 0) return null;

  const displayScale = getScale();
  const size = getContainerSize();
  
  // 스케일이 적용된 실제 크기
  const scaledSize = {
    width: size.width * displayScale,
    height: size.height * displayScale
  };

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden rounded-lg flex items-center justify-center"
      style={{ 
        zIndex: 50,
        pointerEvents: 'none' // 컨테이너는 이벤트를 받지 않음
      }}
    >
      <div
        style={{
          width: `${scaledSize.width}px`,
          height: `${scaledSize.height}px`,
          position: 'relative',
          pointerEvents: 'auto' // 내부 컨테이너는 이벤트를 받음
        }}
        onClick={(e) => {
          // 빈 공간 클릭 시 선택 해제
          if (e.target === e.currentTarget) {
            onSelectClip(null);
          }
        }}
      >
        {showGuides && (
          <div className="absolute inset-0">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400 opacity-50" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400 opacity-50" />
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-cyan-400 opacity-30" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-cyan-400 opacity-30" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-cyan-400 opacity-30" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-cyan-400 opacity-30" />
          </div>
        )}

        {activeClips.map(clip => {
          const isSelected = selectedClip === clip.id;
          
          const has_custom_position = clip.style?.positionX !== undefined && clip.style?.positionY !== undefined;
          let transform_style = 'translate(-50%, -50%)';
          let x = 0;
          let y = 0;
          if (has_custom_position) {
            x = percentToPixel(clip.style?.positionX, scaledSize.width);
            y = percentToPixel(clip.style?.positionY, scaledSize.height);
            // 항상 중앙 정렬 transform 사용
            transform_style = 'translate(-50%, -50%)';
          } else {
            const vertical = clip.style?.verticalPosition || 'middle';
            const align = clip.style?.alignment || 'center';
            const top_percent = TEXT_POSITION_PRESETS.vertical[vertical as keyof typeof TEXT_POSITION_PRESETS.vertical];
            const left_percent = TEXT_POSITION_PRESETS.horizontal[align as keyof typeof TEXT_POSITION_PRESETS.horizontal];
            x = percentToPixel(left_percent, scaledSize.width);
            y = percentToPixel(top_percent, scaledSize.height);
            // CompositePreview와 동일한 transform 로직 적용
            if (align === 'left') {
              transform_style = 'translateY(-50%)';
            } else if (align === 'right') {
              transform_style = 'translate(-100%, -50%)';
            } else {
              transform_style = 'translate(-50%, -50%)';
            }
          }
          
          const actualFontSize = clip.style?.fontSize || TEXT_DEFAULTS.fontSize;
          const fontSizeRatio = clip.style?.fontSizeRatio;
          const fontFamily = clip.style?.fontFamily || TEXT_DEFAULTS.fontFamily;
          const fontWeight = clip.style?.fontWeight || TEXT_DEFAULTS.fontWeight;
          
          // ---- [ 단순화된 텍스트 박스 크기 계산 ] ----
          // 1. 단순화된 텍스트 크기 측정
          const textMeasurement = measureTextSizeSimple(
            clip.content,
            actualFontSize,
            fontSizeRatio,
            fontFamily,
            fontWeight
          );
          
          const { width: textWidth, height: textHeight } = textMeasurement;
          
          // 2. 패딩 계산 - 상대적 크기 적용
          const hasBackground = !!clip.style?.backgroundColor;
          const scale = displayScale; // Remotion Player와 동일 스케일 사용
          // 상대적 패딩 계산
          const containerSize = getContainerSize();
          const paddingX = hasBackground ? ratioToPixels(TEXT_PADDING.horizontalRatio, containerSize.width) * scale : 0;
          const paddingY = hasBackground ? ratioToPixels(TEXT_PADDING.verticalRatio, containerSize.height) * scale : 0;
          
          // 3. 박스 크기 계산 - 콘텐츠(width/height) + 패딩을 스케일링
          const boxWidth = (textWidth * scale) + (paddingX * 2);
          const boxHeight = (textHeight * scale) + (paddingY * 2);
          
          // 4. 시각적 스타일 조정
          const cornerSize = 12 * scale; // 항상 같은 크기의 코너 사용
          // ---- [ 단순화 종료 ] ----

          return (
            <div
              key={clip.id}
              className="absolute"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: transform_style,
                cursor: draggedClip === clip.id ? 'grabbing' : 'grab',
                transition: draggedClip === clip.id ? 'none' : 'all 0.1s',
                pointerEvents: 'auto', // 명시적으로 포인터 이벤트 활성화
                zIndex: isSelected ? 52 : 51 // 선택된 요소를 위로
              }}
              onMouseDown={(e) => handleMouseDown(e, clip.id)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectClip(clip.id);
              }}
            >
              {/* 상호작용 및 테두리를 위한 박스 (텍스트는 렌더링하지 않음) */}
              <div
                style={{
                  // 명시적으로 크기 지정하여 정확한 래핑 구현
                  width: `${boxWidth}px`,
                  height: `${boxHeight}px`,
                  
                  // 상대적 패딩 - 대칭 적용
                  padding: hasBackground 
                    ? `${paddingY}px ${paddingX}px` 
                    : '0',
                  backgroundColor: isSelected ? 'rgba(56, 244, 124, 0.1)' : 'transparent', // 선택 시 약간 보이게
                  borderRadius: '8px',
                  border: isSelected ? '1px solid rgba(56, 244, 124, 0.3)' : '2px solid transparent',
                  boxSizing: 'border-box',
                  userSelect: 'none',
                  cursor: 'move',
                  position: 'relative',
                  
                  // 그림자/글로우 제거하여 실제 렌더 텍스트만 보이게 함
                  boxShadow: 'none',
                }}
              >
                {/* 텍스트는 표시하지 않음. 실제 Remotion 텍스트가 아래에서 보임 */}
                {/* 코너 마커 - 선택 시에만 표시 (모든 크기에서 표시) */}
                {isSelected && (
                  <>
                    {/* Top-left corner */}
                    <div 
                      style={{
                        position: 'absolute',
                        top: -2,
                        left: -2,
                        width: `${cornerSize}px`,
                        height: `${cornerSize}px`,
                        borderTop: '2px solid rgba(255, 255, 255, 0.8)',
                        borderLeft: '2px solid rgba(255, 255, 255, 0.8)',
                        pointerEvents: 'none',
                      }}
                    />
                    {/* Top-right corner */}
                    <div 
                      style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        width: `${cornerSize}px`,
                        height: `${cornerSize}px`,
                        borderTop: '2px solid rgba(255, 255, 255, 0.8)',
                        borderRight: '2px solid rgba(255, 255, 255, 0.8)',
                        pointerEvents: 'none',
                      }}
                    />
                    {/* Bottom-left corner */}
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        left: -2,
                        width: `${cornerSize}px`,
                        height: `${cornerSize}px`,
                        borderBottom: '2px solid rgba(255, 255, 255, 0.8)',
                        borderLeft: '2px solid rgba(255, 255, 255, 0.8)',
                        pointerEvents: 'none',
                      }}
                    />
                    {/* Bottom-right corner */}
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: `${cornerSize}px`,
                        height: `${cornerSize}px`,
                        borderBottom: '2px solid rgba(255, 255, 255, 0.8)',
                        borderRight: '2px solid rgba(255, 255, 255, 0.8)',
                        pointerEvents: 'none',
                      }}
                    />
                  </>
                )}
              </div>

              {isSelected && (
                <>
                  <div
                    className="absolute bottom-0 right-0 bg-white border-2 border-gray-700 rounded-full cursor-se-resize pointer-events-auto"
                    style={{ 
                      width: `${16 * scale}px`,
                      height: `${16 * scale}px`,
                      transform: 'translate(50%, 50%)' 
                    }}
                    onMouseDown={(e) => handleResizeStart(e, clip.id)}
                  />
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    Size: {fontSizeRatio ? Math.round(fontSizeRatio * 1080) : actualFontSize}px
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}