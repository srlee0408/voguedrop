import { useCallback, useState, useRef, useEffect } from 'react';
import { saveProject } from '@/lib/api/projects';
import { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';
import { toast } from 'sonner';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseManualSaveParams {
  projectId?: string | null; // 기존 프로젝트 UUID (수정 시 사용)
  projectTitle: string;
  videoClips: VideoClip[];
  textClips: TextClip[];
  soundClips: SoundClip[];
  soundLanes?: number[];
  aspectRatio: '9:16' | '1:1' | '16:9';
  durationInFrames: number;
  onSaveSuccess?: (savedProjectId: string) => void; // 저장 성공 콜백
}

interface UseManualSaveReturn {
  status: SaveStatus;
  lastSavedAt: Date | null;
  errorMessage: string | null;
  saveProject: () => Promise<boolean>;
}

export function useManualSave({
  projectId,
  projectTitle,
  videoClips,
  textClips,
  soundClips,
  soundLanes = [0],
  aspectRatio,
  durationInFrames,
  onSaveSuccess,
}: UseManualSaveParams): UseManualSaveReturn {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // useRef로 최신 값들을 항상 참조할 수 있도록 함
  const projectIdRef = useRef(projectId);
  const projectTitleRef = useRef(projectTitle);
  
  // refs 업데이트
  useEffect(() => {
    projectIdRef.current = projectId;
    projectTitleRef.current = projectTitle;
  }, [projectId, projectTitle]);
  
  // 수동 저장 함수
  const performSave = useCallback(async (): Promise<boolean> => {
    // ref에서 최신 값 가져오기
    const currentProjectId = projectIdRef.current;
    const currentProjectTitle = projectTitleRef.current;
    
    
    // 이미 저장 중이면 중복 실행 방지
    if (isSaving) {
      return false;
    }
    
    // 저장할 내용이 없으면 건너뛰기
    if (videoClips.length === 0 && textClips.length === 0 && soundClips.length === 0) {
      toast.info('No content to save');
      return false;
    }
    
    setIsSaving(true);
    setStatus('saving');
    setErrorMessage(null);
    
    try {
      const saveParams = {
        projectId: currentProjectId || undefined, // ref에서 가져온 최신 값 사용
        projectName: currentProjectTitle,
        videoClips,
        textClips,
        soundClips,
        soundLanes,
        aspectRatio,
        durationInFrames,
      };
      
      console.log('[useManualSave] 저장 요청 파라미터:', { 
        projectId: saveParams.projectId, 
        projectName: saveParams.projectName 
      });
      
      const result = await saveProject(saveParams);
      
      if (result.success) {
        setStatus('saved');
        setLastSavedAt(new Date());
        toast.success('Project saved successfully');
        
        // 저장 성공 콜백 호출
        if (onSaveSuccess && result.projectSaveId) {
          onSaveSuccess(result.projectSaveId);
        }
        
        // 3초 후 idle 상태로 변경
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
        
        return true;
      } else {
        throw new Error(result.error || 'Failed to save project');
      }
    } catch (error) {
      setStatus('error');
      const message = error instanceof Error ? error.message : 'Failed to save project';
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
  }, [videoClips, textClips, soundClips, soundLanes, aspectRatio, durationInFrames, isSaving]); // projectId, projectTitle은 ref로 관리하므로 제외
  
  // useCallback 의존성 변경 추적
  console.log('[useManualSave] useCallback 의존성:', { projectId, projectTitle });
  
  return {
    status,
    lastSavedAt,
    errorMessage,
    saveProject: performSave,
  };
}