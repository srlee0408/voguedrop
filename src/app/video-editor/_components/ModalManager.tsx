'use client';

import { LibraryModal } from '@/shared/components/modals/LibraryModal';
import VideoLibraryModal from './VideoLibraryModal';
import SoundLibraryModal from './SoundLibraryModal';
import TextEditorModal from './TextEditorModal';
import { useClips, useProject } from '../_context/Providers';

interface ModalManagerProps {
  favoriteVideos: Set<string>;
  onToggleFavorite: (videoId: string) => void;
  onProjectSwitch: (projectName: string) => void;
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
          onToggleFavorite={onToggleFavorite}
          onProjectSwitch={onProjectSwitch}
          currentProjectName={projectTitle}
        />
      )}
    </>
  );
}