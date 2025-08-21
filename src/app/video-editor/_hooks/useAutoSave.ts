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
  
  // Generate optimized content hash to detect real changes
  const generateContentHash = useCallback(() => {
    // 주요 변경 사항만 추적하여 해시 생성 성능 개선
    const videoHash = videoClips.length > 0 
      ? `v${videoClips.length}_${videoClips[0]?.id}_${videoClips[videoClips.length - 1]?.id}_${videoClips.reduce((acc, c) => acc + c.position + c.duration, 0)}`
      : 'v0';
    
    const textHash = textClips.length > 0
      ? `t${textClips.length}_${textClips.reduce((acc, c) => acc + c.content.length + c.position + c.duration, 0)}`
      : 't0';
    
    const soundHash = soundClips.length > 0
      ? `s${soundClips.length}_${soundClips.reduce((acc, c) => acc + c.position + c.duration + (c.volume || 0), 0)}_${soundLanes.join(',')}`
      : 's0';
    
    return `${videoHash}|${textHash}|${soundHash}|${aspectRatio}|${durationInFrames}`;
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
  
  // Simplified auto-save scheduling with debounce
  const scheduleSave = useCallback(() => {
    if (!enabled) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    // Set debounce timeout
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
      saveTimeoutRef.current = null;
    }, debounceMs);
    
    // Simple max wait logic - save after max wait time regardless
    if (!maxWaitTimeoutRef.current) {
      maxWaitTimeoutRef.current = setTimeout(() => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        performSave();
        maxWaitTimeoutRef.current = null;
      }, maxWaitMs);
    }
  }, [enabled, debounceMs, maxWaitMs, performSave]);
  
  // Watch for changes and trigger auto-save
  useEffect(() => {
    if (!enabled) return;
    
    // Skip initial render when no clips exist
    const hasContent = videoClips.length > 0 || textClips.length > 0 || soundClips.length > 0;
    if (!hasContent) return;
    
    scheduleSave();
    
    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
        maxWaitTimeoutRef.current = null;
      }
    };
  }, [videoClips.length, textClips.length, soundClips.length, aspectRatio, durationInFrames, enabled, scheduleSave]); // Simplified deps
  
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