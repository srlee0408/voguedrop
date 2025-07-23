'use client';

import { useState, useEffect } from 'react';

interface TimelineProps {
  clips: Array<{ id: string; duration: number; thumbnails: number }>;
  onAddClip: () => void;
}

export default function Timeline({ clips, onAddClip }: TimelineProps) {
  const [activeClip, setActiveClip] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [resizeHandle, setResizeHandle] = useState<'left' | 'right' | null>(null);

  const handleMouseDown = (e: React.MouseEvent, clipId: string) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      return;
    }
    setIsDragging(true);
    setActiveClip(clipId);
    setDragStartX(e.clientX);
  };

  const handleResizeStart = (e: React.MouseEvent, clipId: string, handle: 'left' | 'right') => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setActiveClip(clipId);
    setDragStartX(e.clientX);
    const clipElement = e.currentTarget.closest('.timeline-clip') as HTMLElement;
    setStartWidth(clipElement.offsetWidth);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeClip) return;

      if (isResizing) {
        const delta = e.clientX - dragStartX;
        const clipElement = document.querySelector(`[data-clip-id="${activeClip}"]`) as HTMLElement;
        if (clipElement) {
          let newWidth;
          if (resizeHandle === 'left') {
            newWidth = Math.max(80, startWidth - delta);
          } else {
            newWidth = Math.max(80, startWidth + delta);
          }
          clipElement.style.width = `${newWidth}px`;
        }
      } else if (isDragging) {
        const delta = e.clientX - dragStartX;
        const clipElement = document.querySelector(`[data-clip-id="${activeClip}"]`) as HTMLElement;
        if (clipElement) {
          clipElement.style.transform = `translateX(${delta}px)`;
        }
      }
    };

    const handleMouseUp = () => {
      if (activeClip) {
        const clipElement = document.querySelector(`[data-clip-id="${activeClip}"]`) as HTMLElement;
        if (clipElement && isDragging) {
          clipElement.style.transform = '';
        }
      }
      setActiveClip(null);
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeClip, isDragging, isResizing, dragStartX, startWidth, resizeHandle]);

  const timeMarkers = Array.from({ length: 15 }, (_, i) => {
    const minutes = Math.floor(i * 30 / 60);
    const seconds = (i * 30) % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  return (
    <div className="bg-gray-800 border-t border-gray-700">
      <div className="relative">
        <div className="flex border-b border-gray-700">
          <div className="w-16 flex-shrink-0 p-2 border-r border-gray-700">
            <span className="text-xs text-gray-400">Time</span>
          </div>
          <div className="flex-1 overflow-x-auto bg-black">
            <div className="flex items-center h-8">
              <div className="flex">
                {timeMarkers.map((time, index) => (
                  <span key={index} className="w-24 text-xs text-gray-400 pl-2">
                    {time}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex">
          <div className="w-16 flex-shrink-0 p-2 border-r border-gray-700">
            <span className="text-xs font-medium text-gray-300">Clip 1</span>
          </div>
          <div className="flex-1 p-2 overflow-x-auto">
            <div className="flex gap-2 items-center">
              <button 
                onClick={onAddClip}
                className="w-16 h-16 bg-black rounded flex items-center justify-center hover:bg-gray-900 transition-colors group"
              >
                <i className="ri-add-line text-2xl text-[#38f47cf9] group-hover:text-white"></i>
              </button>
              {clips.map((clip) => (
                <div 
                  key={clip.id}
                  data-clip-id={clip.id}
                  className="group relative timeline-clip"
                  style={{ width: `${clip.duration}px` }}
                >
                  <div 
                    className="w-full h-16 bg-black rounded cursor-pointer hover:bg-gray-900 transition-colors"
                    onMouseDown={(e) => handleMouseDown(e, clip.id)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex gap-1">
                        {Array.from({ length: clip.thumbnails }).map((_, i) => (
                          <div 
                            key={i}
                            className="w-8 h-12 bg-cover bg-center rounded" 
                            style={{ backgroundImage: `url('https://readdy.ai/api/search-image?query=luxury%20black%20sports%20car%20in%20modern%20minimalist%20showroom%20with%20large%20windows%2C%20dramatic%20lighting%2C%20reflective%20floor%20surface%2C%20futuristic%20architecture%2C%20premium%20automotive%20photography%2C%20high%20contrast%20lighting%2C%20sleek%20design&width=32&height=48&seq=thumb${i}&orientation=squarish')` }}
                          />
                        ))}
                      </div>
                    </div>
                    <div 
                      className="absolute inset-y-0 left-0 w-1 bg-[#38f47cf9] rounded-l cursor-ew-resize resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, clip.id, 'left')}
                    />
                    <div 
                      className="absolute inset-y-0 right-0 w-1 bg-[#38f47cf9] rounded-r cursor-ew-resize resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, clip.id, 'right')}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}