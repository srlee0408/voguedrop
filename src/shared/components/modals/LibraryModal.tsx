import { LibraryModalBase } from '@/shared/components/modals/library/LibraryModalBase';
import { LibraryModalConfig } from '@/shared/types/library-modal';
import { useFavorites } from '@/shared/hooks/useFavorites';

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
  favoriteVideos = new Set(), // eslint-disable-line @typescript-eslint/no-unused-vars
  onToggleFavorite,
  onProjectSwitch,
  currentProjectName
}: LibraryModalProps) {
  // 공통 즐겨찾기 훅 사용
  const { favoriteIds, toggleFavorite } = useFavorites();

  const config: LibraryModalConfig = {
    mode: 'view',
    favorites: {
      enabled: true,
      favoriteIds: favoriteIds, // 공통 훅에서 가져온 데이터 사용
      onToggle: async (videoId: string) => {
        try {
          await toggleFavorite(videoId); // 공통 DB 업데이트 로직 사용
          // 기존 props 콜백도 호출하여 하위 호환성 유지
          onToggleFavorite?.(videoId);
        } catch (error) {
          console.error('Error toggling favorite in LibraryModal:', error);
        }
      }
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