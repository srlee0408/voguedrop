import { useState } from 'react';

/**
 * Legacy timeline state management hook
 * 
 * @deprecated This hook is being phased out in favor of ClipContext for selection state.
 * Only maintains active clip state for drag/resize operations that are local to Timeline.
 * 
 * @description
 * Previously managed both active clips (drag/resize) and selection state.
 * Selection state has been moved to ClipContext for global keyboard shortcut access.
 * 
 * @manages
 * - activeClip: Currently dragged/resized clip ID
 * - activeClipType: Type of the active clip (video/text/sound)
 * 
 * @usage
 * Only used by Timeline component for local drag/resize operations.
 * For selection state, use ClipContext via useClips() hook.
 */
export function useTimelineState() {
  // Active clip state (currently being dragged/resized)
  const [activeClip, setActiveClip] = useState<string | null>(null);
  const [activeClipType, setActiveClipType] = useState<'video' | 'text' | 'sound' | null>(null);

  // Set active clip for operations
  const setActiveClipInfo = (clipId: string | null, clipType: 'video' | 'text' | 'sound' | null) => {
    setActiveClip(clipId);
    setActiveClipType(clipType);
  };

  return {
    // State
    activeClip,
    activeClipType,
    
    // Actions
    setActiveClipInfo,
  };
}