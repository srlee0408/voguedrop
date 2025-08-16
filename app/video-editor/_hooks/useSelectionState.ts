import { useState, useRef } from 'react';

/**
 * Selection box state management hook
 * Manages range selection (Shift+drag) functionality
 */
export function useSelectionState() {
  // Selection container ref
  const selectionContainerRef = useRef<HTMLDivElement>(null);
  
  // Active selection drawing state
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [selectionStartX, setSelectionStartX] = useState<number | null>(null);
  const [selectionCurrentX, setSelectionCurrentX] = useState<number | null>(null);
  const [selectionStartY, setSelectionStartY] = useState<number | null>(null);
  const [selectionCurrentY, setSelectionCurrentY] = useState<number | null>(null);
  
  // Persistent selection state (after mouse up)
  const [isRangeActive, setIsRangeActive] = useState(false);
  const [selectionRangeStartX, setSelectionRangeStartX] = useState<number | null>(null);
  const [selectionRangeEndX, setSelectionRangeEndX] = useState<number | null>(null);
  const [selectionRangeStartY, setSelectionRangeStartY] = useState<number | null>(null);
  const [selectionRangeEndY, setSelectionRangeEndY] = useState<number | null>(null);
  
  // Selection resize state
  const [isAdjustingSelection, setIsAdjustingSelection] = useState(false);
  const [selectionResizeHandle, setSelectionResizeHandle] = useState<'left' | 'right' | 'top' | 'bottom' | null>(null);
  const [selectionDragStartClientX, setSelectionDragStartClientX] = useState(0);
  const [selectionDragStartClientY, setSelectionDragStartClientY] = useState(0);
  const [selectionInitialStartX, setSelectionInitialStartX] = useState(0);
  const [selectionInitialEndX, setSelectionInitialEndX] = useState(0);
  const [selectionInitialStartY, setSelectionInitialStartY] = useState(0);
  const [selectionInitialEndY, setSelectionInitialEndY] = useState(0);
  
  // Selection move state
  const [isMovingSelection, setIsMovingSelection] = useState(false);
  const [moveStartClientX, setMoveStartClientX] = useState(0);
  const [moveStartClientY, setMoveStartClientY] = useState(0);
  const [moveInitialStartX, setMoveInitialStartX] = useState(0);
  const [moveInitialEndX, setMoveInitialEndX] = useState(0);
  const [moveInitialStartY, setMoveInitialStartY] = useState(0);
  const [moveInitialEndY, setMoveInitialEndY] = useState(0);

  // Start selection
  const startSelection = (x: number, y: number) => {
    setIsRangeActive(false);
    setSelectionRangeStartX(null);
    setSelectionRangeEndX(null);
    setSelectionRangeStartY(null);
    setSelectionRangeEndY(null);
    setIsSelectingRange(true);
    setSelectionStartX(x);
    setSelectionCurrentX(x);
    setSelectionStartY(y);
    setSelectionCurrentY(y);
  };

  // Update selection while dragging
  const updateSelection = (x: number, y: number) => {
    setSelectionCurrentX(x);
    setSelectionCurrentY(y);
  };

  // End selection
  const endSelection = () => {
    setIsSelectingRange(false);
    setSelectionStartX(null);
    setSelectionCurrentX(null);
    setSelectionStartY(null);
    setSelectionCurrentY(null);
    setIsRangeActive(false);
    setSelectionRangeStartX(null);
    setSelectionRangeEndX(null);
    setSelectionRangeStartY(null);
    setSelectionRangeEndY(null);
  };

  // Start adjusting selection box
  const startAdjustSelection = (
    e: React.MouseEvent<HTMLDivElement>,
    handle: 'left' | 'right' | 'top' | 'bottom'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isRangeActive) return;
    
    setIsAdjustingSelection(true);
    setSelectionResizeHandle(handle);
    setSelectionDragStartClientX(e.clientX);
    setSelectionDragStartClientY(e.clientY);
    setSelectionInitialStartX(selectionRangeStartX || 0);
    setSelectionInitialEndX(selectionRangeEndX || 0);
    setSelectionInitialStartY(selectionRangeStartY || 0);
    setSelectionInitialEndY(selectionRangeEndY || 0);
  };

  // Start moving selection box
  const startMoveSelection = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isRangeActive) return;
    
    setIsMovingSelection(true);
    setMoveStartClientX(e.clientX);
    setMoveStartClientY(e.clientY);
    setMoveInitialStartX(selectionRangeStartX || 0);
    setMoveInitialEndX(selectionRangeEndX || 0);
    setMoveInitialStartY(selectionRangeStartY || 0);
    setMoveInitialEndY(selectionRangeEndY || 0);
  };

  // Reset all selection states
  const resetSelection = () => {
    setIsSelectingRange(false);
    setIsAdjustingSelection(false);
    setIsMovingSelection(false);
    setSelectionResizeHandle(null);
    endSelection();
  };

  // Calculate selection bounds
  const getSelectionBounds = () => {
    if (isSelectingRange && selectionStartX !== null && selectionCurrentX !== null && 
        selectionStartY !== null && selectionCurrentY !== null) {
      return {
        left: Math.min(selectionStartX, selectionCurrentX),
        right: Math.max(selectionStartX, selectionCurrentX),
        top: Math.min(selectionStartY, selectionCurrentY),
        bottom: Math.max(selectionStartY, selectionCurrentY),
        width: Math.abs(selectionCurrentX - selectionStartX),
        height: Math.abs(selectionCurrentY - selectionStartY),
      };
    }
    
    if (isRangeActive && selectionRangeStartX !== null && selectionRangeEndX !== null &&
        selectionRangeStartY !== null && selectionRangeEndY !== null) {
      return {
        left: Math.min(selectionRangeStartX, selectionRangeEndX),
        right: Math.max(selectionRangeStartX, selectionRangeEndX),
        top: Math.min(selectionRangeStartY, selectionRangeEndY),
        bottom: Math.max(selectionRangeStartY, selectionRangeEndY),
        width: Math.abs(selectionRangeEndX - selectionRangeStartX),
        height: Math.abs(selectionRangeEndY - selectionRangeStartY),
      };
    }
    
    return null;
  };

  return {
    // Refs
    selectionContainerRef,
    
    // Selection state
    isSelectingRange,
    selectionStartX,
    selectionCurrentX,
    selectionStartY,
    selectionCurrentY,
    
    // Active selection state
    isRangeActive,
    selectionRangeStartX,
    selectionRangeEndX,
    selectionRangeStartY,
    selectionRangeEndY,
    
    // Adjustment state
    isAdjustingSelection,
    selectionResizeHandle,
    selectionDragStartClientX,
    selectionDragStartClientY,
    selectionInitialStartX,
    selectionInitialEndX,
    selectionInitialStartY,
    selectionInitialEndY,
    
    // Move state
    isMovingSelection,
    moveStartClientX,
    moveStartClientY,
    moveInitialStartX,
    moveInitialEndX,
    moveInitialStartY,
    moveInitialEndY,
    
    // Actions
    startSelection,
    updateSelection,
    endSelection,
    startAdjustSelection,
    startMoveSelection,
    resetSelection,
    getSelectionBounds,
    
    // Setters for complex operations
    setSelectionRangeStartX,
    setSelectionRangeEndX,
    setSelectionRangeStartY,
    setSelectionRangeEndY,
    setIsAdjustingSelection,
    setIsMovingSelection,
    setSelectionResizeHandle,
  };
}