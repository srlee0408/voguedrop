import { LibraryModalBase } from '@/shared/components/modals/library/LibraryModalBase';
import { LibraryModalConfig } from '@/shared/types/library-modal';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  favoriteVideos?: Set<string>;
  onToggleFavorite?: (videoId: string) => void;
  onProjectSwitch?: (projectId: string) => void; // projectId를 받도록 변경
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
    openProject: {
      enabled: !!onProjectSwitch,  // onProjectSwitch가 있을 때만 활성화
      onProjectNavigate: onProjectSwitch || (() => {})
    },
    dateFilter: {
      enabled: true
    },
    theme: {
      primaryColor: '#38f47cf9',
      buttonStyle: 'success',
      selectionColor: '#38f47cf9'
    },
    onProjectSwitch,  // 레거시 지원을 위해 유지
    currentProjectName
  };

  return <LibraryModalBase isOpen={isOpen} onClose={onClose} config={config} />;
}