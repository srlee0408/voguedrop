import { useState } from 'react';

/**
 * Drag and drop state management hook
 * Manages dragging and resizing operations for timeline clips
 */
export function useDragAndDrop() {
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialDragX, setInitialDragX] = useState(0);
  const [dragDirection, setDragDirection] = useState<'left' | 'right'>('right');
  
  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'left' | 'right' | null>(null);
  const [startWidth, setStartWidth] = useState(0);
  const [startPosition, setStartPosition] = useState(0);
  const [resizeMoved, setResizeMoved] = useState(false);
  const [finalResizeWidth, setFinalResizeWidth] = useState(0);
  const [finalResizePosition, setFinalResizePosition] = useState(0);
  
  // Playhead drag state
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  
  const RESIZE_ACTIVATION_DELTA = 10;

  // Start dragging operation
  const startDrag = (clientX: number) => {
    setIsDragging(true);
    setInitialDragX(clientX);
    setDragStartX(clientX);
  };

  // Start resize operation
  const startResize = (
    clientX: number, 
    handle: 'left' | 'right',
    currentWidth: number,
    currentPosition: number
  ) => {
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStartX(clientX);
    setResizeMoved(false);
    setStartWidth(currentWidth);
    setStartPosition(currentPosition);
    setFinalResizeWidth(currentWidth);
    setFinalResizePosition(currentPosition);
  };

  // Reset drag state
  const resetDragState = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setResizeMoved(false);
    setFinalResizeWidth(0);
    setFinalResizePosition(0);
  };

  // Update drag direction based on movement
  const updateDragDirection = (currentX: number) => {
    const totalDelta = currentX - initialDragX;
    setDragDirection(totalDelta >= 0 ? 'right' : 'left');
  };

  // Check if resize threshold is met
  const checkResizeActivation = (currentX: number): boolean => {
    const delta = Math.abs(currentX - dragStartX);
    if (!resizeMoved && delta > RESIZE_ACTIVATION_DELTA) {
      setResizeMoved(true);
      return true;
    }
    return resizeMoved;
  };

  return {
    // Drag state
    isDragging,
    dragStartX,
    initialDragX,
    dragDirection,
    
    // Resize state
    isResizing,
    resizeHandle,
    startWidth,
    startPosition,
    resizeMoved,
    finalResizeWidth,
    finalResizePosition,
    
    // Playhead state
    isDraggingPlayhead,
    setIsDraggingPlayhead,
    
    // Actions
    startDrag,
    startResize,
    resetDragState,
    updateDragDirection,
    checkResizeActivation,
    setFinalResizeWidth,
    setFinalResizePosition,
  };
}