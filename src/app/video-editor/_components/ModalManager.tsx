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
  
  // 레인별 추가를 위한 상태
  const [targetSoundLaneIndex, setTargetSoundLaneIndex] = useState<number | null>(null);
  const [targetTextLaneIndex, setTargetTextLaneIndex] = useState<number | null>(null);
  const [targetVideoLaneIndex, setTargetVideoLaneIndex] = useState<number | null>(null);
  
  // 'openSoundLibrary' 이벤트 리스너 추가
  useEffect(() => {
    const handleOpenSoundLibrary = (event: CustomEvent) => {
      const { targetLaneIndex: laneIndex } = event.detail;
      setTargetSoundLaneIndex(laneIndex);
      setShowSoundLibrary(true);
    };
    
    window.addEventListener('openSoundLibrary', handleOpenSoundLibrary as EventListener);
    
    return () => {
      window.removeEventListener('openSoundLibrary', handleOpenSoundLibrary as EventListener);
    };
  }, [setShowSoundLibrary]);

  // 'openTextLibrary' 이벤트 리스너 추가
  useEffect(() => {
    const handleOpenTextLibrary = (event: CustomEvent) => {
      const { targetLaneIndex: laneIndex } = event.detail;
      setTargetTextLaneIndex(laneIndex);
      setShowTextEditor(true);
    };
    
    window.addEventListener('openTextLibrary', handleOpenTextLibrary as EventListener);
    
    return () => {
      window.removeEventListener('openTextLibrary', handleOpenTextLibrary as EventListener);
    };
  }, [setShowTextEditor]);

  // 'openVideoLibrary' 이벤트 리스너 추가
  useEffect(() => {
    const handleOpenVideoLibrary = (event: CustomEvent) => {
      const { targetLaneIndex: laneIndex } = event.detail;
      setTargetVideoLaneIndex(laneIndex);
      setShowVideoLibrary(true);
    };
    
    window.addEventListener('openVideoLibrary', handleOpenVideoLibrary as EventListener);
    
    return () => {
      window.removeEventListener('openVideoLibrary', handleOpenVideoLibrary as EventListener);
    };
  }, [setShowVideoLibrary]);

  return (
    <>
      <VideoLibraryModal
        isOpen={showVideoLibrary}
        onClose={() => {
          setShowVideoLibrary(false);
          setTargetVideoLaneIndex(null); // 리셋
        }}
        onAddToTimeline={(items) => {
          // 레인별 비디오 추가 지원
          if (targetVideoLaneIndex !== null) {
            // 특정 레인에 비디오 추가
            const itemsWithLane = items.map(item => ({
              ...item,
              laneIndex: targetVideoLaneIndex
            }));
            handleAddToTimeline(itemsWithLane);
          } else {
            // 기본 레인에 비디오 추가
            handleAddToTimeline(items);
          }
          setShowVideoLibrary(false);
          setTargetVideoLaneIndex(null); // 리셋
        }}
      />

      {showSoundLibrary && (
        <SoundLibraryModal
          onClose={() => setShowSoundLibrary(false)}
          onCreateVideo={() => {
            // TODO: Implement create video functionality
          }}
          onSelectSounds={async (sounds) => {
            // 레인별 사운드 추가 지원
            if (targetSoundLaneIndex !== null) {
              // 특정 레인에 사운드 추가
              const soundsWithLane = sounds.map(sound => ({
                ...sound,
                laneIndex: targetSoundLaneIndex
              }));
              await handleAddSoundClips(soundsWithLane);
            } else {
              // 기본 레인에 사운드 추가
              await handleAddSoundClips(sounds);
            }
            setShowSoundLibrary(false);
            setTargetSoundLaneIndex(null); // 리셋
          }}
        />
      )}

      {showTextEditor && (
        <TextEditorModal
          isOpen={showTextEditor}
          onClose={() => {
            setShowTextEditor(false);
            setEditingTextClip(undefined);
            setTargetTextLaneIndex(null); // 리셋
          }}
          onAddText={handleAddTextClip}
          editingClip={editingTextClip}
          targetLaneIndex={targetTextLaneIndex} // 레인 인덱스 전달
        />
      )}
      
      <LibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        favoriteVideos={favoriteVideos}
        onToggleFavorite={onToggleFavorite}
        onProjectSwitch={onProjectSwitch}
        currentProjectName={projectTitle}
      />
    </>
  );
}