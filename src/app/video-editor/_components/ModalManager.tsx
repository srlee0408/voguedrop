'use client';

import { useEffect, useState } from 'react';
import { LibraryModal } from '@/shared/components/modals/LibraryModal';
import VideoLibraryModal from './VideoLibraryModal';
import SoundLibraryModal from './SoundLibraryModal';
import TextEditorModal from './TextEditorModal';
import { useClips, useProject } from '../_context/Providers';

interface ModalManagerProps {
  favoriteVideos: Set<string>;
  onToggleFavorite: (videoId: string) => void;
  onProjectSwitch: (projectId: string) => void; // projectId를 받도록 변경
  projectTitle: string;
}

export default function ModalManager({
  favoriteVideos,
  onToggleFavorite,
  onProjectSwitch,
  projectTitle,
}: ModalManagerProps) {
  const {
    showVideoLibrary,
    showSoundLibrary,
    showTextEditor,
    showLibrary,
    setShowVideoLibrary,
    setShowSoundLibrary,
    setShowTextEditor,
    setShowLibrary,
  } = useProject();

  const {
    editingTextClip,
    setEditingTextClip,
    handleAddToTimeline,
    handleAddTextClip,
    handleAddSoundClips,
  } = useClips();
  
  // 레인별 사운드 추가를 위한 상태
  const [targetLaneIndex, setTargetLaneIndex] = useState<number | null>(null);
  
  // 'openSoundLibrary' 이벤트 리스너 추가
  useEffect(() => {
    const handleOpenSoundLibrary = (event: CustomEvent) => {
      const { targetLaneIndex: laneIndex } = event.detail;
      setTargetLaneIndex(laneIndex);
      setShowSoundLibrary(true);
    };
    
    window.addEventListener('openSoundLibrary', handleOpenSoundLibrary as EventListener);
    
    return () => {
      window.removeEventListener('openSoundLibrary', handleOpenSoundLibrary as EventListener);
    };
  }, [setShowSoundLibrary]);

  return (
    <>
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
            // 레인별 사운드 추가 지원
            if (targetLaneIndex !== null) {
              // 특정 레인에 사운드 추가
              const soundsWithLane = sounds.map(sound => ({
                ...sound,
                laneIndex: targetLaneIndex
              }));
              await handleAddSoundClips(soundsWithLane);
            } else {
              // 기본 레인에 사운드 추가
              await handleAddSoundClips(sounds);
            }
            setShowSoundLibrary(false);
            setTargetLaneIndex(null); // 리셋
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
          onToggleFavorite={onToggleFavorite}
          onProjectSwitch={onProjectSwitch}
          currentProjectName={projectTitle}
        />
      )}
    </>
  );
}