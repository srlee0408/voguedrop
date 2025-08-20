import { LibraryModalBase } from '@/components/modals/library/LibraryModalBase';
import { LibraryModalConfig } from '@/types/library-modal';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  favoriteVideos?: Set<string>;
  onToggleFavorite?: (videoId: string) => void;
  onProjectSwitch?: (projectName: string) => void;
  currentProjectName?: string;
}

export function LibraryModal({ 
  isOpen, 
  onClose, 
  favoriteVideos = new Set(), 
  onToggleFavorite,
  onProjectSwitch,
  currentProjectName
}: LibraryModalProps) {
  const config: LibraryModalConfig = {
    mode: 'view',
    favorites: {
      enabled: true,
      favoriteIds: favoriteVideos,
      onToggle: onToggleFavorite || (() => {})
    },
    download: {
      enabled: true
    },
    dateFilter: {
      enabled: true
    },
    theme: {
      primaryColor: '#38f47cf9',
      buttonStyle: 'success',
      selectionColor: '#38f47cf9'
    },
    onProjectSwitch,
    currentProjectName
  };

  return <LibraryModalBase isOpen={isOpen} onClose={onClose} config={config} />;
}