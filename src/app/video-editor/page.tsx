'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Header } from '@/shared/components/layout/Header';
import { LibraryModal } from '@/shared/components/modals/LibraryModal';
import { ProjectSwitchConfirmModal } from '@/shared/components/modals/ProjectSwitchConfirmModal';
import { VideoEditorProviders, useClips, usePlayback, useHistory, useProject } from './_context/Providers';
import VideoPreview from './_components/VideoPreview';
import Timeline from './_components/Timeline';
import VideoLibraryModal from './_components/VideoLibraryModal';
import SoundLibraryModal from './_components/SoundLibraryModal';
import TextEditorModal from './_components/TextEditorModal';
import { useAutoSave } from './_hooks/useAutoSave';

// 실제 Video Editor 컴포넌트 (Context 사용)
function VideoEditorContent() {
  
  // 프로젝트 전환 관련 상태
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [targetProjectName, setTargetProjectName] = useState<string>('');
  
  // Context에서 가져오기
  const {
    projectTitle,
    setProjectTitle,
    timelineHeight,
    isResizing,
    handleResizerMouseDown,
    containerRef,
    showVideoLibrary,
    showSoundLibrary,
    showTextEditor,
    showLibrary,
    setShowVideoLibrary,
    setShowSoundLibrary,
    setShowTextEditor,
    setShowLibrary,
    handleAddClip,
    handleAddSound,
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
    hasUnsavedChanges,
    setSelectedTextClip,
    setEditingTextClip,
    setHasUnsavedChanges,
    handleAddToTimeline,
    handleDeleteVideoClip,
    handleDuplicateVideoClip,
    handleSplitVideoClip: contextSplitVideoClip,
    handleResizeVideoClip,
    handleUpdateVideoClipPosition,
    handleUpdateAllVideoClips,
    handleReorderVideoClips,
    handleAddTextClip,
    handleEditTextClip,
    handleDeleteTextClip,
    handleDuplicateTextClip,
    handleSplitTextClip: contextSplitTextClip,
    handleResizeTextClip,
    handleUpdateTextClipPosition,
    handleUpdateAllTextClips,
    handleReorderTextClips,
    handleUpdateTextPosition,
    handleUpdateTextSize,
    handleAddSoundClips,
    handleDeleteSoundClip,
    handleDuplicateSoundClip,
    handleSplitSoundClip: contextSplitSoundClip,
    handleResizeSoundClip,
    handleUpdateSoundClipPosition,
    handleUpdateAllSoundClips,
    handleReorderSoundClips,
    handleUpdateSoundVolume,
    handleUpdateSoundFade,
  } = useClips();
  
  // PlaybackContext에서 가져오기
  const {
    isPlaying,
    currentTime,
    totalDuration,
    playerRef,
    handlePlayPause,
    handleSeek,
    setIsPlaying,
  } = usePlayback();
  
  // HistoryContext에서 가져오기
  const {
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
  } = useHistory();
  
  // URL 파라미터 처리는 ProjectContext에서 이미 처리됨
  
  // 타임라인 스케일: 1초당 몇 px로 표시할지 결정
  const PIXELS_PER_SECOND = 40;
  
  // editingTextClip이 변경될 때 모달을 열기
  useEffect(() => {
    if (editingTextClip) {
      setShowTextEditor(true);
    }
  }, [editingTextClip, setShowTextEditor]);
  
  // Split 함수들 - currentTime을 전달하기 위한 래퍼
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

  // 프레임 동기화를 위한 폴링 - PlaybackContext에서 이미 처리됨
  // 삭제된 함수들: getVideoDurationSeconds, extractTitleFromUrl, handleAddToTimeline 등
  // 이제 모두 Context에서 처리

  const handleEditSoundClip = () => {
    // TODO: Implement sound editing modal
  };
  
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
    aspectRatio: '9:16', // TODO: Get from VideoPreview component
    durationInFrames: calculateTotalFrames,
    enabled: true,
    debounceMs: 15000, // 15초 후 저장 (서버 부하 감소)
    maxWaitMs: 120000, // 최대 2분 대기
  });
  
  // 자동 저장 상태를 ProjectContext와 동기화
  useEffect(() => {
    setAutoSaveStatus(autoSaveStatusLocal);
    setAutoSaveError(autoSaveErrorLocal);
  }, [autoSaveStatusLocal, autoSaveErrorLocal, setAutoSaveStatus, setAutoSaveError]);
  
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

  // 프로젝트 전환 핸들러
  const handleProjectSwitch = useCallback((newProjectName: string) => {
    // 같은 프로젝트를 선택해도 최신 상태로 리로드
    if (newProjectName === projectTitle && !hasUnsavedChanges) {
      // 같은 프로젝트이고 변경사항이 없으면 바로 리로드
      window.location.href = `/video-editor?projectName=${encodeURIComponent(newProjectName)}`;
      return;
    }
    
    if (hasUnsavedChanges) {
      // 변경사항이 있으면 확인 모달 표시
      setTargetProjectName(newProjectName);
      setShowSwitchConfirm(true);
    } else {
      // 변경사항이 없으면 바로 이동 (페이지 완전 리로드)
      window.location.href = `/video-editor?projectName=${encodeURIComponent(newProjectName)}`;
    }
  }, [hasUnsavedChanges, projectTitle]);

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

  // 리사이저 이벤트는 ProjectContext에서 이미 처리됨

  return (
    <div ref={containerRef} className="bg-background text-foreground h-screen overflow-hidden flex flex-col">
      <Header 
        activePage="edit"
        projectTitle={projectTitle}
        onProjectTitleChange={setProjectTitle}
        onLibraryClick={() => setShowLibrary(true)}
        autoSaveStatus={autoSaveStatus}
        autoSaveError={autoSaveError}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 비디오 프리뷰 영역 - 타임라인 높이에 따라 유동적 */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <VideoPreview 
            clips={timelineClips}
            textClips={textClips}
            soundClips={soundClips}
            onRemoveClip={handleDeleteVideoClip}
            playerRef={playerRef}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onPlayStateChange={setIsPlaying}
            onUpdateTextPosition={handleUpdateTextPosition}
            onUpdateTextSize={handleUpdateTextSize}
            selectedTextClip={selectedTextClip}
            onSelectTextClip={setSelectedTextClip}
            projectTitle={projectTitle}
          />
        </div>

        {/* 리사이저 바 - 아래로만 드래그 가능 */}
        <div 
          className={`h-1 bg-gray-700 hover:bg-[#38f47cf9] transition-colors relative ${
            isResizing ? 'bg-[#38f47cf9]' : ''
          } ${timelineHeight >= 300 ? 'cursor-s-resize' : 'cursor-ns-resize'}`}
          onMouseDown={handleResizerMouseDown}
          title={timelineHeight >= 300 ? "드래그하여 타임라인 축소" : "드래그하여 타임라인 크기 조정"}
        >
          {/* 리사이저 핸들 아이콘 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col gap-0.5">
              <div className="w-8 h-0.5 bg-gray-500 rounded-full" />
              <div className="w-8 h-0.5 bg-gray-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* 타임라인 영역 - 고정 높이 */}
        <div 
          className="flex-shrink-0 relative"
          style={{ height: `${timelineHeight}px` }}
        >
          <Timeline 
          clips={timelineClips}
          textClips={textClips}
          soundClips={soundClips}
          onAddClip={handleAddClip}
          onAddText={handleAddText}
          onAddSound={handleAddSound}
          onEditTextClip={handleEditTextClip}
          onEditSoundClip={handleEditSoundClip}
          onDeleteTextClip={handleDeleteTextClip}
          onDeleteSoundClip={handleDeleteSoundClip}
          onDeleteVideoClip={handleDeleteVideoClip}
          onDuplicateVideoClip={handleDuplicateVideoClip}
          onDuplicateTextClip={handleDuplicateTextClip}
          onDuplicateSoundClip={handleDuplicateSoundClip}
          onSplitVideoClip={handleSplitVideoClip}
          onSplitTextClip={handleSplitTextClip}
          onSplitSoundClip={handleSplitSoundClip}
          onResizeTextClip={handleResizeTextClip}
          onResizeSoundClip={handleResizeSoundClip}
          onReorderVideoClips={handleReorderVideoClips}
          onReorderTextClips={handleReorderTextClips}
          onReorderSoundClips={handleReorderSoundClips}
          onResizeVideoClip={handleResizeVideoClip}
          onUpdateVideoClipPosition={handleUpdateVideoClipPosition}
          onUpdateTextClipPosition={handleUpdateTextClipPosition}
          onUpdateSoundClipPosition={handleUpdateSoundClipPosition}
          onUpdateAllVideoClips={handleUpdateAllVideoClips}
          onUpdateAllTextClips={handleUpdateAllTextClips}
          onUpdateAllSoundClips={handleUpdateAllSoundClips}
          onUpdateSoundVolume={handleUpdateSoundVolume}
          onUpdateSoundFade={handleUpdateSoundFade}
          pixelsPerSecond={PIXELS_PER_SECOND}
          currentTime={currentTime}
          totalDuration={totalDuration}
          isPlaying={isPlaying}
          onSeek={handleSeek}
          onPlayPause={handlePlayPause}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          />
        </div>
      </div>

      {showVideoLibrary && (
        <VideoLibraryModal
          onClose={() => setShowVideoLibrary(false)}
          onAddToTimeline={handleAddToTimeline}
        />
      )}

      {showSoundLibrary && (
        <SoundLibraryModal
          onClose={() => setShowSoundLibrary(false)}
          onCreateVideo={() => {
            // TODO: Implement create video functionality
          }}
          onSelectSounds={async (sounds) => {
            // 사운드 클립들을 추가
            await handleAddSoundClips(sounds);
            setShowSoundLibrary(false);
          }}
        />
      )}

      {showTextEditor && (
        <TextEditorModal
          isOpen={showTextEditor}
          onClose={() => {
            setShowTextEditor(false);
            setEditingTextClip(undefined);
          }}
          onAddText={handleAddTextClip}
          editingClip={editingTextClip}
        />
      )}
      
      {showLibrary && (
        <LibraryModal
          isOpen={showLibrary}
          onClose={() => setShowLibrary(false)}
          favoriteVideos={favoriteVideos}
          onToggleFavorite={handleToggleFavorite}
          onProjectSwitch={handleProjectSwitch}
          currentProjectName={projectTitle}
        />
      )}
      
      {/* 프로젝트 전환 확인 모달 */}
      <ProjectSwitchConfirmModal
        isOpen={showSwitchConfirm}
        onClose={() => setShowSwitchConfirm(false)}
        onSave={handleSaveProject}
        onDontSave={handleDontSaveProject}
        currentProjectName={projectTitle}
        targetProjectName={targetProjectName}
      />
    </div>
  );
}

// Context Provider로 감싼 페이지 컴포넌트
export default function VideoEditorPage() {
  return (
    <VideoEditorProviders>
      <VideoEditorContent />
    </VideoEditorProviders>
  );
}