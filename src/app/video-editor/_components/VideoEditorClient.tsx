'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useClips, usePlayback, useProject, useHistory } from '../_context/Providers';
import EditorLayout from './EditorLayout';
import PreviewSection from './PreviewSection';
import TimelineSection from './TimelineSection';
import ModalManager from './ModalManager';
import ProjectManager from './ProjectManager';

export default function VideoEditorClient() {
  // Context에서 가져오기
  const {
    projectTitle,
    setProjectTitle,
    setShowLibrary,
    setShowTextEditor,
    handleAddText: handleAddTextButton,
    autoSaveStatus,
    setAutoSaveStatus,
    autoSaveError,
    setAutoSaveError,
  } = useProject();
  
  // ClipContext에서 가져오기
  const {
    timelineClips,
    textClips,
    soundClips,
    selectedTextClip,
    editingTextClip,
    setSelectedTextClip,
    setEditingTextClip,
    handleDeleteVideoClip,
    handleUpdateTextPosition,
    handleUpdateTextSize,
    // 키보드 단축키용 새로운 함수들
    handleDeleteSelectedClips,
    handleDuplicateSelectedClip,
    handleCopyClip,
    handlePasteClip,
  } = useClips();
  
  // PlaybackContext에서 가져오기
  const {
    currentTime,
    handlePlayPause,
  } = usePlayback();
  
  // HistoryContext에서 가져오기
  const {
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
  } = useHistory();
  
  // 타임라인 스케일: 1초당 몇 px로 표시할지 결정
  const PIXELS_PER_SECOND = 40;
  
  // editingTextClip이 변경될 때 모달을 열기
  useEffect(() => {
    if (editingTextClip) {
      setShowTextEditor(true);
    }
  }, [editingTextClip, setShowTextEditor]);
  
  // Split 함수들 - currentTime을 전달하기 위한 래퍼
  const { 
    handleSplitVideoClip: contextSplitVideoClip,
    handleSplitTextClip: contextSplitTextClip,
    handleSplitSoundClip: contextSplitSoundClip,
  } = useClips();

  const handleSplitVideoClip = (id: string) => {
    contextSplitVideoClip(id, currentTime, PIXELS_PER_SECOND);
  };
  
  const handleSplitTextClip = (id: string) => {
    contextSplitTextClip(id, currentTime, PIXELS_PER_SECOND);
  };
  
  const handleSplitSoundClip = (id: string) => {
    contextSplitSoundClip(id, currentTime, PIXELS_PER_SECOND);
  };

  // handleAddText 함수 (텍스트 에디터 모달용)
  const handleAddText = () => {
    setEditingTextClip(undefined);
    handleAddTextButton();
  };

  const handleEditSoundClip = () => {
    // TODO: Implement sound editing modal
  };

  // 키보드 단축키 이벤트 리스너
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 입력 필드에서 키 이벤트를 무시 (텍스트 편집 중일 때)
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
      const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      switch (event.key) {
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          handleDeleteSelectedClips();
          break;

        case 'z':
        case 'Z':
          if (isCtrlOrCmd) {
            event.preventDefault();
            if (event.shiftKey) {
              // Ctrl/Cmd + Shift + Z = Redo
              if (canRedo) {
                handleRedo();
              }
            } else {
              // Ctrl/Cmd + Z = Undo
              if (canUndo) {
                handleUndo();
              }
            }
          }
          break;

        case 'y':
        case 'Y':
          if (isCtrlOrCmd) {
            event.preventDefault();
            // Ctrl/Cmd + Y = Redo (Windows 스타일)
            if (canRedo) {
              handleRedo();
            }
          }
          break;

        case 'c':
        case 'C':
          if (isCtrlOrCmd) {
            event.preventDefault();
            handleCopyClip();
          }
          break;

        case 'v':
        case 'V':
          if (isCtrlOrCmd) {
            event.preventDefault();
            handlePasteClip(currentTime);
          }
          break;

        case 'd':
        case 'D':
          if (isCtrlOrCmd) {
            event.preventDefault();
            handleDuplicateSelectedClip();
          }
          break;

        case ' ':
          event.preventDefault();
          handlePlayPause();
          break;

        default:
          break;
      }
    };

    // 전역 키보드 이벤트 리스너 등록
    document.addEventListener('keydown', handleKeyDown);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    handleDeleteSelectedClips,
    handleDuplicateSelectedClip,
    handleCopyClip,
    handlePasteClip,
    handleUndo,
    handleRedo,
    handlePlayPause,
    canUndo,
    canRedo,
    currentTime
  ]);
  
  // 총 프레임 계산
  const calculateTotalFrames = useMemo(() => {
    const maxEndTime = Math.max(
      ...timelineClips.map(c => c.position + c.duration),
      ...textClips.map(c => c.position + c.duration),
      ...soundClips.map(c => c.position + c.duration),
      0
    );
    return Math.ceil(maxEndTime * 30); // 30fps 기준
  }, [timelineClips, textClips, soundClips]);
  
  // Favorites 상태 관리 (간단한 로컬 상태로 처리)
  const [favoriteVideos, setFavoriteVideos] = useState<Set<string>>(new Set());
  
  const handleToggleFavorite = useCallback((videoId: string) => {
    setFavoriteVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  }, []);

  // 프로젝트 전환 핸들러 - ProjectManager에서 처리하지만 여기서 정의
  const handleProjectSwitch = useCallback((newProjectName: string) => {
    // ProjectManager에서 구현되지만, 실제로는 여기서 정의해서 전달해야 함
    // 임시로 간단한 구현
    window.location.href = `/video-editor?projectName=${encodeURIComponent(newProjectName)}`;
  }, []);

  return (
    <EditorLayout
      projectTitle={projectTitle}
      onProjectTitleChange={setProjectTitle}
      onLibraryClick={() => setShowLibrary(true)}
      autoSaveStatus={autoSaveStatus}
      autoSaveError={autoSaveError}
    >
      <PreviewSection
        projectTitle={projectTitle}
        selectedTextClip={selectedTextClip}
        onSelectTextClip={setSelectedTextClip}
        onRemoveClip={handleDeleteVideoClip}
        onUpdateTextPosition={handleUpdateTextPosition}
        onUpdateTextSize={handleUpdateTextSize}
      />

      <TimelineSection
        PIXELS_PER_SECOND={PIXELS_PER_SECOND}
        onSplitVideoClip={handleSplitVideoClip}
        onSplitTextClip={handleSplitTextClip}
        onSplitSoundClip={handleSplitSoundClip}
        onAddText={handleAddText}
        onEditSoundClip={handleEditSoundClip}
      />

      <ModalManager
        favoriteVideos={favoriteVideos}
        onToggleFavorite={handleToggleFavorite}
        onProjectSwitch={handleProjectSwitch}
        projectTitle={projectTitle}
      />

      <ProjectManager
        projectTitle={projectTitle}
        timelineClips={timelineClips}
        textClips={textClips}
        soundClips={soundClips}
        calculateTotalFrames={calculateTotalFrames}
        autoSaveStatus={autoSaveStatus}
        setAutoSaveStatus={setAutoSaveStatus}
        setAutoSaveError={setAutoSaveError}
      />
    </EditorLayout>
  );
}