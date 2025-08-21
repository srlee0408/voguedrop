import { useEffect, useRef, useCallback, useState } from 'react';
import { saveProject } from '@/lib/api/projects';
import { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';
import { toast } from 'sonner';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveParams {
  projectTitle: string;
  videoClips: VideoClip[];
  textClips: TextClip[];
  soundClips: SoundClip[];
  soundLanes?: number[]; // 사운드 레인 배열
  aspectRatio: '9:16' | '1:1' | '16:9';
  durationInFrames: number;
  enabled?: boolean;
  debounceMs?: number;
  maxWaitMs?: number;
}

interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  errorMessage: string | null;
  triggerSave: () => Promise<void>;
}

export function useAutoSave({
  projectTitle,
  videoClips,
  textClips,
  soundClips,
  soundLanes = [0],
  aspectRatio,
  durationInFrames,
  enabled = true,
  debounceMs = 30000, // 30 seconds debounce
  maxWaitMs = 120000, // 2 minutes max wait
}: UseAutoSaveParams): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxWaitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const retryCountRef = useRef(0);
  const lastContentHashRef = useRef<string>('');
  
  // Generate content hash to detect real changes
  const generateContentHash = useCallback(() => {
    const content = {
      videoClips: videoClips.map(c => ({
        id: c.id,
        position: c.position,
        duration: c.duration,
        url: c.url,
        startTime: c.startTime,
        endTime: c.endTime,
      })),
      textClips: textClips.map(c => ({
        id: c.id,
        content: c.content,
        position: c.position,
        duration: c.duration,
        style: c.style,
        effect: c.effect,
      })),
      soundClips: soundClips.map(c => ({
        id: c.id,
        url: c.url,
        position: c.position,
        duration: c.duration,
        volume: c.volume,
        laneIndex: c.laneIndex ?? 0, // 레인 인덱스 추가
        startTime: c.startTime,
        endTime: c.endTime,
        fadeInDuration: c.fadeInDuration,
        fadeOutDuration: c.fadeOutDuration,
        fadeInType: c.fadeInType,
        fadeOutType: c.fadeOutType,
        maxDuration: c.maxDuration,
        waveformData: c.waveformData,
      })),
      soundLanes, // 사운드 레인 정보 추가
      aspectRatio,
      durationInFrames,
    };
    return JSON.stringify(content);
  }, [videoClips, textClips, soundClips, soundLanes, aspectRatio, durationInFrames]);
  
  // Save function with retry logic
  const performSave = useCallback(async () => {
    if (isSavingRef.current) {
      return;
    }
    
    // Check if content actually changed
    const currentHash = generateContentHash();
    if (currentHash === lastContentHashRef.current) {
      setStatus('saved');
      return;
    }
    
    isSavingRef.current = true;
    setStatus('saving');
    setErrorMessage(null);
    
    try {
      
      const result = await saveProject({
        projectName: projectTitle,
        videoClips,
        textClips,
        soundClips,
        soundLanes,
        aspectRatio,
        durationInFrames,
      });
      
      if (result.success) {
        setStatus('saved');
        setLastSavedAt(new Date());
        lastContentHashRef.current = currentHash;
        retryCountRef.current = 0;
      } else {
        throw new Error(result.error || 'Failed to save project');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save');
      
      // Retry with exponential backoff
      if (retryCountRef.current < 3) {
        const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 8000);
        retryCountRef.current++;
        
        setTimeout(() => {
          performSave();
        }, retryDelay);
      } else {
        // Show error toast after max retries
        toast.error('Failed to auto-save project. Please save manually.', {
          duration: 5000,
        });
        retryCountRef.current = 0;
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [projectTitle, videoClips, textClips, soundClips, soundLanes, aspectRatio, durationInFrames, generateContentHash]);
  
  // Trigger save (can be called manually)
  const triggerSave = useCallback(async () => {
    // Clear any pending timeouts
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
      maxWaitTimeoutRef.current = null;
    }
    
    await performSave();
  }, [performSave]);
  
  // Schedule auto-save with debounce and max wait
  const scheduleSave = useCallback(() => {
    if (!enabled) return;
    
    // Clear existing debounce timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new debounce timeout
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
      // Clear max wait timeout when save happens
      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
        maxWaitTimeoutRef.current = null;
      }
    }, debounceMs);
    
    // Set max wait timeout if not already set
    if (!maxWaitTimeoutRef.current) {
      maxWaitTimeoutRef.current = setTimeout(() => {
        performSave();
        // Clear debounce timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        maxWaitTimeoutRef.current = null;
      }, maxWaitMs);
    }
  }, [enabled, debounceMs, maxWaitMs, performSave]);
  
  // Watch for changes and trigger auto-save
  useEffect(() => {
    if (!enabled) return;
    
    // Skip initial render
    if (videoClips.length === 0 && textClips.length === 0 && soundClips.length === 0) {
      return;
    }
    
    scheduleSave();
    
    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
      }
    };
  }, [videoClips, textClips, soundClips, aspectRatio, durationInFrames, scheduleSave, enabled]);
  
  // Save on unmount or page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === 'saving' || (enabled && generateContentHash() !== lastContentHashRef.current)) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Try to save on unmount
      if (enabled && generateContentHash() !== lastContentHashRef.current) {
        triggerSave();
      }
    };
  }, [status, enabled, generateContentHash, triggerSave]);
  
  return {
    status,
    lastSavedAt,
    errorMessage,
    triggerSave,
  };
}