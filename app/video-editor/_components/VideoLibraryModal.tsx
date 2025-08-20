'use client';

import { LibraryModalBase } from '@/components/modals/library/LibraryModalBase';
import { LibraryModalConfig } from '@/types/library-modal';
import { LibraryItem } from '@/types/video-editor';

interface VideoLibraryModalProps {
  onClose: () => void;
  onAddToTimeline: (items: LibraryItem[]) => void;
}

export default function VideoLibraryModal({ onClose, onAddToTimeline }: VideoLibraryModalProps) {
  const config: LibraryModalConfig = {
    mode: 'selection',
    selection: {
      enabled: true,
      maxItems: 10,
      onSelect: onAddToTimeline
    },
    openProject: {
      enabled: false,  // Add Clip 모드에서는 프로젝트 열기 버튼 비활성화
      onProjectNavigate: () => {}
    },
    projectFilter: {
      enabled: true,
      requireVideo: true,  // 렌더링된 비디오가 있는 프로젝트만 표시
      emptyMessage: 'No exported projects available'
    },
    theme: {
      primaryColor: '#38f47cf9',
      buttonStyle: 'success',
      selectionColor: '#38f47cf9'
    }
  };

  return <LibraryModalBase isOpen={true} onClose={onClose} config={config} />;
}