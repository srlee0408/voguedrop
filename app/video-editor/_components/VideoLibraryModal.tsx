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
    theme: {
      primaryColor: '#38f47cf9',
      buttonStyle: 'success',
      selectionColor: '#38f47cf9'
    }
  };

  return <LibraryModalBase isOpen={true} onClose={onClose} config={config} />;
}