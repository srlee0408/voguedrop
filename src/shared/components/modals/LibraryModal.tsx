import { LibraryModalBase } from '@/shared/components/modals/library/LibraryModalBase';
import { LibraryModalConfig } from '@/shared/types/library-modal';

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
    openProject: {
      enabled: true,  // 일반 Library 모달에서는 프로젝트 열기 버튼 활성화
      onProjectNavigate: onProjectSwitch || ((projectName: string) => {
        window.location.href = `/video-editor?projectName=${encodeURIComponent(projectName)}`;
      })
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