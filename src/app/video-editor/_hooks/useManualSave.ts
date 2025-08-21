import { useCallback, useState } from 'react';
import { saveProject } from '@/lib/api/projects';
import { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';
import { toast } from 'sonner';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseManualSaveParams {
  projectTitle: string;
  videoClips: VideoClip[];
  textClips: TextClip[];
  soundClips: SoundClip[];
  soundLanes?: number[];
  aspectRatio: '9:16' | '1:1' | '16:9';
  durationInFrames: number;
}

interface UseManualSaveReturn {
  status: SaveStatus;
  lastSavedAt: Date | null;
  errorMessage: string | null;
  saveProject: () => Promise<boolean>;
}

export function useManualSave({
  projectTitle,
  videoClips,
  textClips,
  soundClips,
  soundLanes = [0],
  aspectRatio,
  durationInFrames,
}: UseManualSaveParams): UseManualSaveReturn {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // 수동 저장 함수
  const performSave = useCallback(async (): Promise<boolean> => {
    // 이미 저장 중이면 중복 실행 방지
    if (isSaving) {
      return false;
    }
    
    // 저장할 내용이 없으면 건너뛰기
    if (videoClips.length === 0 && textClips.length === 0 && soundClips.length === 0) {
      toast.info('저장할 내용이 없습니다.');
      return false;
    }
    
    setIsSaving(true);
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
        toast.success('프로젝트가 저장되었습니다.');
        
        // 3초 후 idle 상태로 변경
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
        
        return true;
      } else {
        throw new Error(result.error || '프로젝트 저장에 실패했습니다.');
      }
    } catch (error) {
      setStatus('error');
      const message = error instanceof Error ? error.message : '프로젝트 저장에 실패했습니다.';
      setErrorMessage(message);
      toast.error(message);
      
      // 5초 후 idle 상태로 변경
      setTimeout(() => {
        setStatus('idle');
      }, 5000);
      
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [projectTitle, videoClips, textClips, soundClips, soundLanes, aspectRatio, durationInFrames, isSaving]);
  
  return {
    status,
    lastSavedAt,
    errorMessage,
    saveProject: performSave,
  };
}