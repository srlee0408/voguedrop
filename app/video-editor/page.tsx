'use client';

import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { VideoEditorProviders, useClips, usePlayback, useHistory, useProject } from './_context/Providers';
import VideoPreview from './_components/VideoPreview';
import Timeline from './_components/Timeline';
import VideoLibraryModal from './_components/VideoLibraryModal';
import SoundLibraryModal from './_components/SoundLibraryModal';
import TextEditorModal from './_components/TextEditorModal';

// 실제 Video Editor 컴포넌트 (Context 사용)
function VideoEditorContent() {
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
    setShowVideoLibrary,
    setShowSoundLibrary,
    setShowTextEditor,
    handleAddClip,
    handleAddSound,
    handleAddText: handleAddTextButton,
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
  } = useClips();
  
  // PlaybackContext에서 가져오기
  const {
    isPlaying,
    currentTime,
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

  // 리사이저 이벤트는 ProjectContext에서 이미 처리됨

  return (
    <div ref={containerRef} className="bg-background text-foreground h-screen overflow-hidden flex flex-col">
      <Header 
        activePage="edit"
        projectTitle={projectTitle}
        onProjectTitleChange={setProjectTitle}
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
          pixelsPerSecond={PIXELS_PER_SECOND}
          currentTime={currentTime}
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