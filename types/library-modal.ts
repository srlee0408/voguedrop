import { LibraryItem } from './video-editor';

/**
 * LibraryModal 설정 인터페이스
 * 모달의 동작 모드와 기능을 정의합니다.
 */
export interface LibraryModalConfig {
  /** 모달 동작 모드 */
  mode: 'selection' | 'view';
  
  /** 선택 모드 설정 */
  selection?: {
    enabled: boolean;
    maxItems: number;
    onSelect: (items: LibraryItem[]) => void;
  };
  
  /** 즐겨찾기 설정 */
  favorites?: {
    enabled: boolean;
    favoriteIds: Set<string>;
    onToggle: (videoId: string) => void;
  };
  
  /** 다운로드 설정 */
  download?: {
    enabled: boolean;
  };

  openProject?: {
    enabled: boolean;
    onProjectNavigate: (projectName: string) => void;
  };
  
  /** 날짜 필터 설정 */
  dateFilter?: {
    enabled: boolean;
  };
  
  /** UI 테마 설정 */
  theme?: {
    primaryColor: string;
    buttonStyle: 'primary' | 'success';
    selectionColor?: string;
  };
  
  /** 프로젝트 전환 콜백 (video-editor에서 사용) */
  onProjectSwitch?: (projectName: string) => void;
  
  /** 현재 프로젝트 이름 (테두리 표시용) */
  currentProjectName?: string;
}

/**
 * LibraryModalBase Props
 */
export interface LibraryModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  config: LibraryModalConfig;
}

/**
 * Library 카테고리 타입
 */
export type LibraryCategory = 'clips' | 'projects' | 'uploads';

/**
 * Library 데이터 카운트
 */
export interface LibraryCounts {
  clips: number;
  projects: number;
  uploads: number;
}