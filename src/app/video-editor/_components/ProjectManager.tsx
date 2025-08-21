'use client';

import { useState, useCallback, useEffect } from 'react';
import { ProjectSwitchConfirmModal } from '@/shared/components/modals/ProjectSwitchConfirmModal';
import { useClips } from '../_context/Providers';
import { useAutoSave } from '../_hooks/useAutoSave';
import type { AutoSaveStatus } from '../_hooks/useAutoSave';
import type { VideoClip, TextClip, SoundClip } from '@/shared/types/video-editor';

interface ProjectManagerProps {
  projectTitle: string;
  timelineClips: VideoClip[];
  textClips: TextClip[];
  soundClips: SoundClip[];
  soundLanes?: number[]; // 사운드 레인 배열
  calculateTotalFrames: number;
  autoSaveStatus: AutoSaveStatus;
  setAutoSaveStatus: (status: AutoSaveStatus) => void;
  setAutoSaveError: (error: string | null) => void;
}

export default function ProjectManager({
  projectTitle,
  timelineClips,
  textClips,
  soundClips,
  soundLanes = [0],
  calculateTotalFrames,
  autoSaveStatus,
  setAutoSaveStatus,
  setAutoSaveError,
}: ProjectManagerProps) {
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [targetProjectName, setTargetProjectName] = useState<string>('');

  const {
    setHasUnsavedChanges,
  } = useClips();

  // 자동 저장 설정
  const {
    status: autoSaveStatusLocal,
    errorMessage: autoSaveErrorLocal,
    triggerSave,
  } = useAutoSave({
    projectTitle,
    videoClips: timelineClips,
    textClips,
    soundClips,
    soundLanes,
    aspectRatio: '9:16', // TODO: Get from VideoPreview component
    durationInFrames: calculateTotalFrames,
    enabled: true,
    debounceMs: 15000, // 15초 후 저장 (서버 부하 감소)
    maxWaitMs: 120000, // 최대 2분 대기
  });

  // 자동 저장 상태 동기화
  useEffect(() => {
    setAutoSaveStatus(autoSaveStatusLocal);
    setAutoSaveError(autoSaveErrorLocal);
  }, [autoSaveStatusLocal, autoSaveErrorLocal, setAutoSaveStatus, setAutoSaveError]);


  // 프로젝트 저장 핸들러 (자동 저장 훅 활용)
  const handleSaveProject = useCallback(async () => {
    // 자동 저장 훅의 triggerSave 사용
    await triggerSave();
    
    // 저장 성공 시 처리
    if (autoSaveStatus === 'saved' || autoSaveStatus === 'saving') {
      setHasUnsavedChanges(false);
      
      // 저장 후 새 프로젝트로 이동
      if (targetProjectName) {
        setShowSwitchConfirm(false);
        setTargetProjectName('');
        // 페이지 완전 리로드하여 새 프로젝트 로드
        window.location.href = `/video-editor?projectName=${encodeURIComponent(targetProjectName)}`;
      }
    }
  }, [triggerSave, autoSaveStatus, setHasUnsavedChanges, targetProjectName]);

  // 저장하지 않고 전환
  const handleDontSaveProject = useCallback(() => {
    setHasUnsavedChanges(false);
    setShowSwitchConfirm(false);
    const projectToLoad = targetProjectName;
    setTargetProjectName('');
    // 페이지 완전 리로드하여 새 프로젝트 로드
    window.location.href = `/video-editor?projectName=${encodeURIComponent(projectToLoad)}`;
  }, [targetProjectName, setHasUnsavedChanges]);

  return (
    <>
      {/* 프로젝트 전환 확인 모달 */}
      <ProjectSwitchConfirmModal
        isOpen={showSwitchConfirm}
        onClose={() => setShowSwitchConfirm(false)}
        onSave={handleSaveProject}
        onDontSave={handleDontSaveProject}
        currentProjectName={projectTitle}
        targetProjectName={targetProjectName}
      />
    </>
  );

  // 외부에서 사용할 수 있도록 핸들러를 반환
  // 하지만 React 컴포넌트이므로 직접 반환할 수는 없음
  // 대신 context를 통해 공유하거나 props로 전달해야 함
}