'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuItem {
  label: string;
  icon: string;
  action: () => void;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // 메뉴가 화면 밖으로 나가지 않도록 위치 조정
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      // 우측 경계 체크
      if (rect.right > viewportWidth) {
        adjustedX = x - rect.width;
      }

      // 하단 경계 체크
      if (rect.bottom > viewportHeight) {
        adjustedY = y - rect.height;
      }

      // 좌측 경계 체크
      if (adjustedX < 0) {
        adjustedX = 0;
      }

      // 상단 경계 체크
      if (adjustedY < 0) {
        adjustedY = 0;
      }

      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [x, y]);

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-2 z-[9999] min-w-[180px]"
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            if (!item.disabled) {
              item.action();
              onClose();
            }
          }}
          disabled={item.disabled}
          className={`
            w-full px-4 py-2 text-left flex items-center gap-3 transition-colors
            ${item.disabled 
              ? 'text-gray-500 cursor-not-allowed' 
              : 'text-gray-200 hover:bg-gray-700 hover:text-white'
            }
          `}
        >
          <i className={`${item.icon} text-sm`}></i>
          <span className="text-sm">{item.label}</span>
        </button>
      ))}
    </div>
  );

  // Portal을 사용하여 document.body에 직접 렌더링
  if (typeof document !== 'undefined') {
    return createPortal(menuContent, document.body);
  }

  return null;
}