'use client';

import { useState, ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  usePortal?: boolean; // Portal 사용 여부 (기본값: true)
}

export function Tooltip({ 
  children, 
  text, 
  position = 'top',
  className = '',
  usePortal = true
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-4',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-4',
    left: 'right-full top-1/2 -translate-y-1/2 mr-4',
    right: 'left-full top-1/2 -translate-y-1/2 ml-4',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800',
  };

  // 컴포넌트 마운트 상태 체크
  useEffect(() => {
    setMounted(true);
  }, []);

  // Tooltip 위치 계산
  useEffect(() => {
    if (isVisible && triggerRef.current && usePortal) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollX = window.pageXOffset;
      const scrollY = window.pageYOffset;
      
      let x = rect.left + scrollX + rect.width / 2;
      let y = rect.top + scrollY;
      
      // position에 따른 위치 조정 (더 넓은 간격으로 수정)
      switch (position) {
        case 'top':
          y -= 30; // 위쪽으로 더 멀리 이동
          break;
        case 'bottom':
          y += rect.height + 16;
          break;
        case 'left':
          x = rect.left + scrollX - 16;
          y += rect.height / 2;
          break;
        case 'right':
          x = rect.right + scrollX + 16;
          y += rect.height / 2;
          break;
      }
      
      setTooltipPosition({ x, y });
    }
  }, [isVisible, position, usePortal]);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  // Portal을 사용하지 않는 경우 (기존 방식)
  if (!usePortal) {
    return (
      <div 
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
        {isVisible && text && (
          <div 
            className={`
              absolute z-[9999] pointer-events-none
              ${positionClasses[position]}
              ${className}
            `}
          >
            <div className="relative">
              <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {text}
              </div>
              <div 
                className={`
                  absolute w-0 h-0 
                  border-4 border-transparent
                  ${arrowClasses[position]}
                `}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Portal 사용하는 경우
  return (
    <>
      <div 
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      
      {mounted && isVisible && text && createPortal(
        <div 
          className={`fixed z-[9999] pointer-events-none ${className}`}
          style={{
            left: position === 'left' ? tooltipPosition.x : position === 'right' ? tooltipPosition.x : tooltipPosition.x,
            top: position === 'top' ? tooltipPosition.y : position === 'bottom' ? tooltipPosition.y : tooltipPosition.y,
            transform: position === 'top' || position === 'bottom' 
              ? 'translateX(-50%)' 
              : position === 'left' 
                ? 'translate(-100%, -50%)'
                : position === 'right'
                  ? 'translate(0%, -50%)'
                  : 'translateX(-50%)'
          }}
        >
          <div className="relative">
            <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
              {text}
            </div>
            {/* Arrow - 간소화된 버전 */}
            <div 
              className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
                position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
                position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
                position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
                'right-full top-1/2 -translate-y-1/2 -mr-1'
              }`}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}