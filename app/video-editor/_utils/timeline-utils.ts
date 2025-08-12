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
  duration: number
): number => {
  
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
      
      // threshold 이상 겹칠 때만 재배치 대상
      return overlapAmount > OVERLAP_THRESHOLD;
    }
    return false;
  });
  
  if (overlappingClips.length === 0) {
    // No significant overlap, place at requested position
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
  
  if (draggedCenter > targetClipCenter) {
    // 드래그한 클립의 중심이 타겟 클립보다 오른쪽 → 오른쪽에 배치
    const finalPos = closestClip.position + closestClip.duration;
    return finalPos;
  } else {
    // 드래그한 클립의 중심이 타겟 클립보다 왼쪽 → 왼쪽에 배치
    const leftPosition = closestClip.position - duration;
    
    // 음수 위치가 되면 오른쪽에 배치
    if (leftPosition < 0) {
      const finalPos = closestClip.position + closestClip.duration;
      return finalPos;
    }
    return leftPosition;
  }
};

/**
 * Magnetic positioning - automatically positions clips with smart insertion
 * @param clips Array of all clips (including the one being dragged)
 * @param draggedClipId ID of the clip being dragged
 * @param requestedPosition Position where the clip is being placed
 * @param duration Duration of the clip being placed
 * @returns Target position and adjusted clips array
 */
export const magneticPositioning = <T extends BaseClip>(
  clips: T[],
  draggedClipId: string,
  requestedPosition: number,
  duration: number
): { targetPosition: number; adjustedClips: T[] } => {
  // 드래그된 클립 제외한 클립들을 position 순으로 정렬
  const otherClips = clips.filter(c => c.id !== draggedClipId);
  const sortedClips = [...otherClips].sort((a, b) => a.position - b.position);
  
  // 클립이 없으면 그냥 요청 위치에 배치
  if (sortedClips.length === 0) {
    return { targetPosition: Math.max(0, requestedPosition), adjustedClips: [] };
  }
  
  // 드래그된 클립의 중심과 끝점
  const draggedCenter = requestedPosition + (duration / 2);
  const draggedEnd = requestedPosition + duration;
  
  // 1. 두 클립 사이에 있는지 확인
  for (let i = 0; i < sortedClips.length - 1; i++) {
    const leftClip = sortedClips[i];
    const rightClip = sortedClips[i + 1];
    
    const leftEnd = leftClip.position + leftClip.duration;
    const rightStart = rightClip.position;
    
    // 드래그한 클립이 두 클립 사이 공간과 관련이 있는지 확인
    // 더 넓은 범위로 감지: 중심이 사이에 있거나, 클립의 일부가 사이 공간과 겹치는 경우
    const isInBetween = 
      (draggedCenter >= leftEnd && draggedCenter <= rightStart) || // 중심이 사이에
      (requestedPosition >= leftEnd && requestedPosition <= rightStart) || // 시작이 사이에
      (draggedEnd >= leftEnd && draggedEnd <= rightStart) || // 끝이 사이에
      (requestedPosition <= leftEnd && draggedEnd >= rightStart); // 공간을 완전히 덮음
    
    if (isInBetween) {
      const gap = rightStart - leftEnd;
      
      console.log('클립 사이 감지:', {
        왼쪽클립끝: leftEnd,
        오른쪽클립시작: rightStart,
        간격: gap,
        필요공간: duration
      });
      
      if (gap >= duration) {
        // 공간이 충분하면 그 사이에 배치
        console.log('공간 충분 - 사이에 정확히 배치');
        return {
          targetPosition: leftEnd, // 왼쪽 클립 바로 뒤
          adjustedClips: otherClips
        };
      } else {
        // 공간이 부족하면 오른쪽 클립들만 밀어냄
        // 정확한 밀기 양: 왼쪽 클립 끝 + 드래그 클립 길이 - 오른쪽 클립 시작
        const pushAmount = (leftEnd + duration) - rightStart;
        console.log('공간 부족 - 오른쪽 클립 밀기:', pushAmount);
        
        const adjustedClips = sortedClips.map((clip, idx) => {
          if (idx <= i) {
            // 왼쪽 클립들은 그대로
            return clip;
          } else {
            // 오른쪽 클립들을 밀어냄
            return { ...clip, position: clip.position + pushAmount } as T;
          }
        });
        
        return {
          targetPosition: leftEnd, // 왼쪽 클립 바로 뒤에 정확히 배치
          adjustedClips
        };
      }
    }
  }
  
  // 2. 맨 앞에 놓으려는 경우
  if (draggedEnd <= sortedClips[0].position) {
    console.log('맨 앞에 배치');
    return {
      targetPosition: Math.max(0, requestedPosition),
      adjustedClips: otherClips
    };
  }
  
  // 3. 맨 앞 클립과 겹치는 경우 - 모든 클립 밀기
  if (requestedPosition < sortedClips[0].position && draggedEnd > sortedClips[0].position) {
    const pushAmount = draggedEnd - sortedClips[0].position;
    console.log('맨 앞 클립과 겹침 - 모두 밀기:', pushAmount);
    
    const adjustedClips = sortedClips.map(clip => ({
      ...clip,
      position: clip.position + pushAmount
    } as T));
    
    return {
      targetPosition: Math.max(0, requestedPosition),
      adjustedClips
    };
  }
  
  // 4. 단일 클립 위에 있는 경우 - 중심 기준 좌/우 배치
  const overlappingClip = sortedClips.find(clip =>
    requestedPosition < clip.position + clip.duration &&
    draggedEnd > clip.position
  );
  
  if (overlappingClip) {
    const clipCenter = overlappingClip.position + (overlappingClip.duration / 2);
    
    console.log('클립 위에 배치 - 중심 비교:', {
      드래그중심: draggedCenter,
      클립중심: clipCenter
    });
    
    if (draggedCenter > clipCenter) {
      // 오른쪽에 배치
      console.log('오른쪽에 배치');
      return {
        targetPosition: overlappingClip.position + overlappingClip.duration,
        adjustedClips: otherClips
      };
    } else {
      // 왼쪽에 배치
      const leftPos = overlappingClip.position - duration;
      
      if (leftPos < 0) {
        // 맨 앞 공간 부족 - 모든 클립 밀어내기
        const pushAmount = -leftPos;
        console.log('왼쪽 공간 부족 - 모두 밀기:', pushAmount);
        
        const adjustedClips = sortedClips.map(clip => ({
          ...clip,
          position: clip.position + pushAmount
        } as T));
        
        return {
          targetPosition: 0,
          adjustedClips
        };
      }
      
      console.log('왼쪽에 배치');
      return {
        targetPosition: leftPos,
        adjustedClips: otherClips
      };
    }
  }
  
  // 5. 빈 공간에 배치
  console.log('빈 공간에 배치');
  return {
    targetPosition: Math.max(0, requestedPosition),
    adjustedClips: otherClips
  };
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