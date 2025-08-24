'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getShortId } from '@/shared/lib/utils';
import { useClips, usePlayback, useProject, useHistory } from '../_context/Providers';
import { getAllClipBoundaries, findPreviousBoundary, findNextBoundary } from '../_utils/timeline-helpers';
import EditorLayout from './EditorLayout';
import PreviewSection from './PreviewSection';
import TimelineSection from './TimelineSection';
import ModalManager from './ModalManager';
import ProjectManager from './ProjectManager';

export default function VideoEditorClient() {
  const router = useRouter();
  
  // Context에서 가져오기
  const {
    projectTitle,
    setProjectTitle,
    setShowLibrary,
    setShowTextEditor,
    handleAddText: handleAddTextButton,
    saveStatus,
    setSaveStatus,
    saveError,
    setSaveError,
  } = useProject();
  
  // ClipContext에서 가져오기
  const {
    timelineClips,
    textClips,
    soundClips,
    soundLanes,
    selectedTextClip,
    editingTextClip,
    setSelectedTextClip,
    setEditingTextClip,
    handleDeleteVideoClip,
    handleUpdateTextPosition,
    handleUpdateTextSize,
    // 사운드 레인 관리 함수들
    handleAddSoundLane,
    handleDeleteSoundLane,
    handleAddSoundToLane,
    handleUpdateSoundClipLane,
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
    handleSeek,
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
  
  // 수동 저장 함수 참조
  const saveProjectRef = useRef<(() => Promise<boolean>) | null>(null);
  
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

        case 'ArrowLeft':
          event.preventDefault();
          // 이전 클립 경계로 이동
          const boundaries = getAllClipBoundaries(
            timelineClips, 
            textClips, 
            soundClips, 
            PIXELS_PER_SECOND
          );
          const prevBoundary = findPreviousBoundary(currentTime, boundaries);
          if (prevBoundary !== null) {
            handleSeek(prevBoundary);
          }
          break;

        case 'ArrowRight':
          event.preventDefault();
          // 다음 클립 경계로 이동
          const rightBoundaries = getAllClipBoundaries(
            timelineClips, 
            textClips, 
            soundClips, 
            PIXELS_PER_SECOND
          );
          const nextBoundary = findNextBoundary(currentTime, rightBoundaries);
          if (nextBoundary !== null) {
            handleSeek(nextBoundary);
          }
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
    handleSeek,
    canUndo,
    canRedo,
    currentTime,
    timelineClips,
    textClips,
    soundClips
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

  // 기존 프로젝트 열기 핸들러 - projectId로 이동
  const handleProjectSwitch = useCallback((projectId: string) => {
    const shortId = getShortId(projectId);
    router.push(`/video-editor?project=${shortId}`);
  }, [router]);

  
  // 저장 성공 후 URL 업데이트 (8자리 단축 ID 사용)
  const handleSaveSuccess = useCallback((savedProjectId: string) => {
    const shortId = getShortId(savedProjectId);
    router.replace(`/video-editor?project=${shortId}`, { scroll: false });
  }, [router]);

  // 수동 저장 핸들러
  const handleSaveProject = useCallback(async () => {
    if (saveProjectRef.current) {
      await saveProjectRef.current();
    }
  }, []);
  
  // 키보드 단축키 설정
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S / Ctrl+S: 저장
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveProject();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSaveProject]);

  return (
    <>
      <EditorLayout
        projectTitle={projectTitle}
        onProjectTitleChange={setProjectTitle}
        onLibraryClick={() => setShowLibrary(true)}
        saveStatus={saveStatus}
        saveError={saveError}
        onSaveProject={handleSaveProject}
        previewSection={
          <PreviewSection
            projectTitle={projectTitle}
            selectedTextClip={selectedTextClip}
            onSelectTextClip={setSelectedTextClip}
            onRemoveClip={handleDeleteVideoClip}
            onUpdateTextPosition={handleUpdateTextPosition}
            onUpdateTextSize={handleUpdateTextSize}
            onSaveProject={handleSaveProject}
          />
        }
        timelineSection={
          <TimelineSection
            PIXELS_PER_SECOND={PIXELS_PER_SECOND}
            soundLanes={soundLanes}
            onSplitVideoClip={handleSplitVideoClip}
            onSplitTextClip={handleSplitTextClip}
            onSplitSoundClip={handleSplitSoundClip}
            onAddText={handleAddText}
            onEditSoundClip={handleEditSoundClip}
            onAddSoundLane={handleAddSoundLane}
            onDeleteSoundLane={handleDeleteSoundLane}
            onAddSoundToLane={handleAddSoundToLane}
            onUpdateSoundClipLane={handleUpdateSoundClipLane}
          />
        }
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
        soundLanes={soundLanes}
        calculateTotalFrames={calculateTotalFrames}
        saveStatus={saveStatus}
        setSaveStatus={setSaveStatus}
        setSaveError={setSaveError}
        onSaveProject={(saveFunc) => {
          saveProjectRef.current = saveFunc;
        }}
        onSaveSuccess={handleSaveSuccess}
      />
    </>
  );
}