import { useState } from 'react';

/**
 * Core timeline state management hook
 * Manages active clips, selection, and playback state
 */
export function useTimelineState() {
  // Active clip state (currently being dragged/resized)
  const [activeClip, setActiveClip] = useState<string | null>(null);
  const [activeClipType, setActiveClipType] = useState<'video' | 'text' | 'sound' | null>(null);
  
  // Selected clip state (for toolbar actions)
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [selectedClipType, setSelectedClipType] = useState<'video' | 'text' | 'sound' | null>(null);
  
  // Multi-selection state
  const [rectSelectedClips, setRectSelectedClips] = useState<{ 
    id: string; 
    type: 'video' | 'text' | 'sound' 
  }[]>([]);

  // Clear all selections
  const clearSelection = () => {
    setSelectedClip(null);
    setSelectedClipType(null);
    setRectSelectedClips([]);
  };

  // Handle single clip selection
  const selectClip = (clipId: string, clipType: 'video' | 'text' | 'sound') => {
    if (rectSelectedClips.length > 0) {
      setRectSelectedClips([]);
    }
    setSelectedClip(clipId);
    setSelectedClipType(clipType);
  };

  // Set active clip for operations
  const setActiveClipInfo = (clipId: string | null, clipType: 'video' | 'text' | 'sound' | null) => {
    setActiveClip(clipId);
    setActiveClipType(clipType);
  };

  return {
    // State
    activeClip,
    activeClipType,
    selectedClip,
    selectedClipType,
    rectSelectedClips,
    
    // Actions
    setActiveClipInfo,
    selectClip,
    clearSelection,
    setRectSelectedClips,
  };
}