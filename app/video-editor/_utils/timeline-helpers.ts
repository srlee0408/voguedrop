import { VideoClip, TextClip, SoundClip } from '@/types/video-editor';
import { BaseClip } from './timeline-utils';

/**
 * Generic timeline helper functions to reduce code duplication
 */

// Clip type union
export type AnyClip = VideoClip | TextClip | SoundClip;
export type ClipType = 'video' | 'text' | 'sound';

/**
 * Generic function to find a clip by ID
 */
export function findClipById<T extends BaseClip>(
  clips: T[],
  clipId: string
): T | undefined {
  return clips.find(c => c.id === clipId);
}

/**
 * Generic function to get clip at position
 */
export function getClipAtPosition<T extends BaseClip>(
  clips: T[],
  position: number
): T | null {
  const clip = clips.find(c => 
    position >= c.position &&
    position <= c.position + c.duration
  );
  return clip || null;
}

/**
 * Generic function to check if clips overlap
 */
export function checkClipsOverlap<T extends BaseClip>(
  clip1: T,
  clip2: T
): boolean {
  const clip1Start = clip1.position;
  const clip1End = clip1.position + clip1.duration;
  const clip2Start = clip2.position;
  const clip2End = clip2.position + clip2.duration;
  
  return clip1Start < clip2End && clip1End > clip2Start;
}

/**
 * Generic function to sort clips by position
 */
export function sortClipsByPosition<T extends BaseClip>(clips: T[]): T[] {
  return [...clips].sort((a, b) => a.position - b.position);
}

/**
 * Generic function to get clips in range
 */
export function getClipsInRange<T extends BaseClip>(
  clips: T[],
  startPosition: number,
  endPosition: number
): T[] {
  return clips.filter(clip => {
    const clipStart = clip.position;
    const clipEnd = clip.position + clip.duration;
    
    // Check if clip overlaps with range
    return clipStart < endPosition && clipEnd > startPosition;
  });
}

/**
 * Generic function to update clip position
 */
export function updateClipPosition<T extends BaseClip>(
  clips: T[],
  clipId: string,
  newPosition: number
): T[] {
  return clips.map(clip => 
    clip.id === clipId 
      ? { ...clip, position: Math.max(0, newPosition) }
      : clip
  );
}

/**
 * Generic function to update clip duration
 */
export function updateClipDuration<T extends BaseClip>(
  clips: T[],
  clipId: string,
  newDuration: number
): T[] {
  return clips.map(clip => 
    clip.id === clipId 
      ? { ...clip, duration: Math.max(80, newDuration) } // Minimum 80px width
      : clip
  );
}

/**
 * Get clips by type from timeline state
 */
export function getClipsByType(
  type: ClipType,
  videoClips: VideoClip[],
  textClips: TextClip[],
  soundClips: SoundClip[]
): AnyClip[] {
  switch (type) {
    case 'video':
      return videoClips;
    case 'text':
      return textClips;
    case 'sound':
      return soundClips;
    default:
      return [];
  }
}

/**
 * Calculate timeline duration from all tracks
 */
export function calculateTimelineDuration(
  videoClips: VideoClip[],
  textClips: TextClip[],
  soundClips: SoundClip[],
  pixelsPerSecond: number
): number {
  const getTrackEnd = (clips: BaseClip[]) => {
    if (clips.length === 0) return 0;
    return Math.max(...clips.map(c => c.position + c.duration));
  };
  
  const videoEnd = getTrackEnd(videoClips) / pixelsPerSecond;
  const textEnd = getTrackEnd(textClips) / pixelsPerSecond;
  const soundEnd = getTrackEnd(soundClips) / pixelsPerSecond;
  
  return Math.max(videoEnd, textEnd, soundEnd, 0);
}

/**
 * Format time display (seconds to MM:SS)
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate time markers for timeline
 */
export function generateTimeMarkers(duration: number, interval: number = 1): string[] {
  const markers: string[] = [];
  for (let i = 0; i <= Math.ceil(duration); i += interval) {
    markers.push(formatTime(i));
  }
  return markers;
}

/**
 * Check if position is near clip edge (for snapping)
 */
export function isNearClipEdge<T extends BaseClip>(
  position: number,
  clips: T[],
  threshold: number = 10
): { snap: boolean; snapPosition: number } {
  for (const clip of clips) {
    const clipStart = clip.position;
    const clipEnd = clip.position + clip.duration;
    
    if (Math.abs(position - clipStart) <= threshold) {
      return { snap: true, snapPosition: clipStart };
    }
    
    if (Math.abs(position - clipEnd) <= threshold) {
      return { snap: true, snapPosition: clipEnd };
    }
  }
  
  return { snap: false, snapPosition: position };
}

/**
 * Get the next available clip ID
 */
export function generateClipId(prefix: string = 'clip'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if a rectangle intersects with a clip
 */
export function isClipInSelectionRect<T extends BaseClip>(
  clip: T,
  rectLeft: number,
  rectRight: number,
  trackTop: number,
  trackBottom: number,
  clipTop: number,
  clipHeight: number
): boolean {
  const clipLeft = clip.position;
  const clipRight = clip.position + clip.duration;
  const clipBottom = clipTop + clipHeight;
  
  return (
    clipLeft < rectRight &&
    clipRight > rectLeft &&
    clipTop < trackBottom &&
    clipBottom > trackTop
  );
}

/**
 * Batch delete clips by IDs
 */
export function deleteClipsByIds<T extends BaseClip>(
  clips: T[],
  idsToDelete: string[]
): T[] {
  return clips.filter(clip => !idsToDelete.includes(clip.id));
}

/**
 * Duplicate a clip with new ID and position
 */
export function duplicateClip<T extends BaseClip>(
  clip: T,
  newPosition?: number
): T {
  return {
    ...clip,
    id: generateClipId(clip.id.split('_')[0]),
    position: newPosition ?? clip.position + clip.duration,
  };
}