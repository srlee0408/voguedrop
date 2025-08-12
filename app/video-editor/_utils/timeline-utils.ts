/**
 * Timeline utility functions for clip manipulation
 */

export interface BaseClip {
  id: string;
  duration: number;
  position: number;
  maxDuration?: number;
}

/**
 * Snap position to grid (e.g., 1-second intervals)
 * @param position Current position in pixels
 * @param gridSize Grid size in pixels (e.g., 40px = 1 second)
 * @returns Snapped position
 */
export const snapToGrid = (position: number, gridSize: number): number => {
  return Math.round(position / gridSize) * gridSize;
};

/**
 * Check if a clip would overlap with other clips
 * @param clips Array of clips to check against
 * @param clipId ID of the clip being moved
 * @param newPosition New position for the clip
 * @param duration Duration of the clip
 * @returns true if there's an overlap
 */
export const checkClipOverlap = <T extends BaseClip>(
  clips: T[],
  clipId: string,
  newPosition: number,
  duration: number
): boolean => {
  return clips.some(clip => 
    clip.id !== clipId &&
    newPosition < clip.position + clip.duration &&
    newPosition + duration > clip.position
  );
};

/**
 * Validate clip position and duration
 * @param position Clip position
 * @param duration Current duration
 * @param maxDuration Maximum allowed duration
 * @returns Valid duration
 */
export const validateClipDuration = (
  duration: number,
  maxDuration?: number
): number => {
  const minDuration = 80; // Minimum clip width in pixels
  let validDuration = Math.max(minDuration, duration);
  
  if (maxDuration !== undefined && maxDuration > 0) {
    validDuration = Math.min(validDuration, maxDuration);
  }
  
  return validDuration;
};

/**
 * Calculate valid position for a clip
 * @param position Requested position
 * @param duration Clip duration
 * @param timelineWidth Total timeline width
 * @returns Valid position
 */
export const validateClipPosition = (
  position: number,
  duration: number,
  timelineWidth?: number
): number => {
  // Ensure position is not negative
  let validPosition = Math.max(0, position);
  
  // If timeline width is provided, ensure clip doesn't go beyond timeline
  if (timelineWidth !== undefined && timelineWidth > 0) {
    const maxPosition = Math.max(0, timelineWidth - duration);
    validPosition = Math.min(validPosition, maxPosition);
  }
  
  return validPosition;
};

/**
 * Get the next available position after existing clips
 * @param clips Array of clips
 * @returns Next available position
 */
export const getNextAvailablePosition = <T extends BaseClip>(
  clips: T[]
): number => {
  if (clips.length === 0) return 0;
  
  const lastClipEnd = Math.max(
    ...clips.map(clip => clip.position + clip.duration)
  );
  
  return lastClipEnd; // No gap between clips
};

/**
 * Find a gap where a clip can fit
 * @param clips Array of clips sorted by position
 * @param duration Duration of clip to place
 * @param preferredPosition Preferred position (will find nearest valid position)
 * @returns Valid position or null if no space
 */
export const findAvailablePosition = <T extends BaseClip>(
  clips: T[],
  duration: number,
  preferredPosition: number = 0
): number | null => {
  // Sort clips by position
  const sortedClips = [...clips].sort((a, b) => a.position - b.position);
  
  // Check if preferred position is available
  const hasOverlap = checkClipOverlap(clips, '', preferredPosition, duration);
  if (!hasOverlap) {
    return Math.max(0, preferredPosition);
  }
  
  // Find first available gap
  let currentPosition = 0;
  
  for (const clip of sortedClips) {
    if (currentPosition + duration <= clip.position) {
      return currentPosition;
    }
    currentPosition = clip.position + clip.duration; // No gap between clips
  }
  
  return currentPosition;
};

/**
 * Get clip at position (for click selection)
 * @param clips Array of clips
 * @param clickPosition Click position in pixels
 * @returns Clip at position or null
 */
export const getClipAtPosition = <T extends BaseClip>(
  clips: T[],
  clickPosition: number
): T | null => {
  return clips.find(clip => 
    clickPosition >= clip.position &&
    clickPosition <= clip.position + clip.duration
  ) || null;
};

/**
 * Find available position for new clip without overlap
 * @param clips Array of existing clips
 * @param startPosition Starting position to search from
 * @param duration Duration of the new clip
 * @param gridSize Grid size for snapping (e.g., 40px = 1 second)
 * @returns Available position without overlap
 */
export const findNonOverlappingPosition = <T extends BaseClip>(
  clips: T[],
  startPosition: number,
  duration: number,
  gridSize: number
): number => {
  let position = startPosition;
  
  // Keep moving right until we find a position without overlap
  while (clips.some(clip =>
    position < clip.position + clip.duration &&
    position + duration > clip.position
  )) {
    position += gridSize; // Move by grid size (1 second)
  }
  
  return position;
};

/**
 * Get the next position for adding a new clip
 * @param clips Array of existing clips
 * @param currentTime Current playhead time in seconds
 * @param pixelsPerSecond Pixels per second ratio
 * @returns Next position for the new clip
 */
export const getNextPosition = <T extends BaseClip>(
  clips: T[],
  currentTime: number,
  pixelsPerSecond: number
): number => {
  if (clips.length === 0) return 0;
  
  if (currentTime > 0) {
    // Use playhead position when it's not at the start
    return currentTime * pixelsPerSecond;
  } else {
    // Place after the last clip when playhead is at 0
    return clips.reduce((max, clip) => {
      const clipEnd = clip.position + clip.duration;
      return Math.max(max, clipEnd);
    }, 0);
  }
};

/**
 * Find non-overlapping position based on drag direction
 * @param clips Array of existing clips (excluding the dragged clip)
 * @param requestedPosition The position where user wants to place the clip
 * @param duration Duration of the clip being placed
 * @param dragDirection Direction of the drag ('left' or 'right')
 * @param gridSize Grid size for snapping
 * @returns Non-overlapping position based on drag direction
 */
export const findNonOverlappingPositionWithDirection = <T extends BaseClip>(
  clips: T[],
  requestedPosition: number,
  duration: number,
  dragDirection: 'left' | 'right'
): number => {
  console.log('findNonOverlappingPositionWithDirection 호출:', {
    요청위치: requestedPosition,
    클립길이: duration,
    드래그방향: dragDirection,
    다른클립수: clips.length
  });
  
  // 겹침을 허용할 최소 threshold (픽셀)
  const OVERLAP_THRESHOLD = 20; // 20픽셀 이상 겹쳐야 자동 재배치
  
  // Find overlapping clips
  const overlappingClips = clips.filter(clip => {
    const clipStart = clip.position;
    const clipEnd = clip.position + clip.duration;
    const draggedStart = requestedPosition;
    const draggedEnd = requestedPosition + duration;
    
    // 겹침 체크
    if (draggedStart < clipEnd && draggedEnd > clipStart) {
      // 겹침 정도 계산
      const overlapStart = Math.max(draggedStart, clipStart);
      const overlapEnd = Math.min(draggedEnd, clipEnd);
      const overlapAmount = overlapEnd - overlapStart;
      
      console.log(`클립과 겹침: ${overlapAmount}px`);
      
      // threshold 이상 겹칠 때만 재배치 대상
      return overlapAmount > OVERLAP_THRESHOLD;
    }
    return false;
  });
  
  console.log('재배치 필요한 겹치는 클립들:', overlappingClips.map(c => ({
    위치: c.position,
    길이: c.duration,
    끝: c.position + c.duration
  })));
  
  if (overlappingClips.length === 0) {
    // No significant overlap, place at requested position
    console.log('충분한 겹침 없음, 요청 위치 사용:', requestedPosition);
    return Math.max(0, requestedPosition);
  }
  
  // 드래그된 클립의 중심점
  const draggedCenter = requestedPosition + (duration / 2);
  
  // 겹치는 클립들 중 가장 가까운 클립 찾기
  const closestClip = overlappingClips.reduce((closest, clip) => {
    const clipCenter = clip.position + (clip.duration / 2);
    const closestCenter = closest.position + (closest.duration / 2);
    
    const distToCurrent = Math.abs(draggedCenter - clipCenter);
    const distToClosest = Math.abs(draggedCenter - closestCenter);
    
    return distToCurrent < distToClosest ? clip : closest;
  });
  
  // 가장 가까운 클립의 중심과 비교하여 배치 위치 결정
  const targetClipCenter = closestClip.position + (closestClip.duration / 2);
  
  console.log('위치 기반 배치:', {
    드래그클립중심: draggedCenter,
    타겟클립중심: targetClipCenter,
    타겟클립: closestClip,
    오른쪽배치여부: draggedCenter > targetClipCenter
  });
  
  if (draggedCenter > targetClipCenter) {
    // 드래그한 클립의 중심이 타겟 클립보다 오른쪽 → 오른쪽에 배치
    const finalPos = closestClip.position + closestClip.duration;
    console.log('타겟 클립의 오른쪽에 배치:', finalPos);
    return finalPos;
  } else {
    // 드래그한 클립의 중심이 타겟 클립보다 왼쪽 → 왼쪽에 배치
    const leftPosition = closestClip.position - duration;
    
    console.log('타겟 클립의 왼쪽에 배치 시도:', leftPosition);
    
    // 음수 위치가 되면 오른쪽에 배치
    if (leftPosition < 0) {
      const finalPos = closestClip.position + closestClip.duration;
      console.log('음수 위치 방지 - 오른쪽에 배치:', finalPos);
      return finalPos;
    }
    return leftPosition;
  }
};

/**
 * Magnetic insert - pushes clips to the right when inserting
 * @param clips Array of existing clips
 * @param insertPosition Position where new clip will be inserted
 * @param insertDuration Duration of the clip being inserted
 * @returns Updated clips array with pushed positions
 */
export const magneticInsert = <T extends BaseClip>(
  clips: T[],
  insertPosition: number,
  insertDuration: number
): T[] => {
  return clips.map(clip => {
    // Push clips that are at or after the insert position
    if (clip.position >= insertPosition) {
      return {
        ...clip,
        position: clip.position + insertDuration
      };
    }
    // Clips that overlap with insert position get pushed
    if (clip.position < insertPosition && clip.position + clip.duration > insertPosition) {
      return {
        ...clip,
        position: insertPosition + insertDuration
      };
    }
    return clip;
  });
};

/**
 * Magnetic delete - pulls clips to the left when deleting (ripple delete)
 * @param clips Array of clips
 * @param deletedPosition Position of deleted clip
 * @param deletedDuration Duration of deleted clip
 * @returns Updated clips array with pulled positions
 */
export const magneticDelete = <T extends BaseClip>(
  clips: T[],
  deletedPosition: number,
  deletedDuration: number
): T[] => {
  return clips.map(clip => {
    // Pull clips that are after the deleted position
    if (clip.position > deletedPosition) {
      return {
        ...clip,
        position: Math.max(deletedPosition, clip.position - deletedDuration)
      };
    }
    return clip;
  });
};

/**
 * Remove gaps between clips (compress timeline)
 * @param clips Array of clips
 * @returns Clips array with gaps removed
 */
export const removeGaps = <T extends BaseClip>(clips: T[]): T[] => {
  if (clips.length === 0) return clips;
  
  // Sort clips by position
  const sortedClips = [...clips].sort((a, b) => a.position - b.position);
  
  return sortedClips.map((clip, index) => {
    if (index === 0) {
      // First clip stays at position 0
      return { ...clip, position: 0 };
    }
    
    const previousClip = sortedClips[index - 1];
    const expectedPosition = previousClip.position + previousClip.duration;
    
    // Remove gap if exists
    if (clip.position > expectedPosition) {
      return { ...clip, position: expectedPosition };
    }
    
    return clip;
  });
};

/**
 * Get the end position of the last clip
 * @param clips Array of clips
 * @returns End position of the last clip
 */
export const getTimelineEnd = <T extends BaseClip>(clips: T[]): number => {
  if (clips.length === 0) return 0;
  
  return clips.reduce((max, clip) => {
    const clipEnd = clip.position + clip.duration;
    return Math.max(max, clipEnd);
  }, 0);
};

/**
 * Recalculate clip positions after duration change
 * Ensures clips remain tightly packed without gaps
 * @param clips Array of clips
 * @param changedClipId ID of the clip whose duration changed
 * @param newDuration New duration of the changed clip
 * @returns Updated clips array with recalculated positions
 */
export const recalculatePositionsAfterDurationChange = <T extends BaseClip>(
  clips: T[],
  changedClipId: string,
  newDuration: number
): T[] => {
  const clipIndex = clips.findIndex(c => c.id === changedClipId);
  if (clipIndex === -1) return clips;
  
  const oldDuration = clips[clipIndex].duration;
  const durationDiff = newDuration - oldDuration;
  
  return clips.map((clip, idx) => {
    if (clip.id === changedClipId) {
      // Update the changed clip's duration
      return { ...clip, duration: newDuration };
    } else if (idx > clipIndex) {
      // Adjust positions of clips after the changed clip
      return { ...clip, position: clip.position + durationDiff };
    }
    return clip;
  });
};