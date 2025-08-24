import { LibraryItem, LibraryVideo, LibraryProject, UserUploadedVideo } from './video-editor';

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
    favoriteIds?: Set<string>; // 선택적 필드로 변경 (서버 응답의 is_favorite 사용)
    onToggle: (videoId: string) => void;
  };
  
  /** 다운로드 설정 */
  download?: {
    enabled: boolean;
  };

  openProject?: {
    enabled: boolean;
    onProjectNavigate: (projectId: string) => void;
  };
  
  /** 프로젝트 필터 설정 */
  projectFilter?: {
    enabled: boolean;
    requireVideo: boolean;  // true면 비디오가 있는 프로젝트만 표시
    emptyMessage?: string;  // 필터링 후 프로젝트가 없을 때 표시할 메시지
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
  onProjectSwitch?: (projectId: string) => void;
  
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
export type LibraryCategory = 'favorites' | 'clips' | 'projects' | 'uploads';

/**
 * Library 데이터 카운트
 */
export interface LibraryCounts {
  favorites: number;
  clips: number;
  projects: number;
  uploads: number;
}

/**
 * Library API 응답 타입 (즐겨찾기/일반 클립 API용)
 * PROJECT_GUIDE.md 타입 규칙에 따른 명시적 타입 정의
 */
export interface LibraryResponse {
  favorites?: LibraryVideo[];
  regular?: LibraryVideo[];
  clips?: LibraryVideo[];
  projects?: LibraryProject[];
  uploads?: (UserUploadedVideo & { url?: string })[];
  pagination?: LibraryPaginationInfo;
  totalCount?: number;
  counts?: LibraryResponseCounts;
}

/**
 * Library API 페이지네이션 정보
 */
export interface LibraryPaginationInfo {
  hasNextPage: boolean;
  nextCursor?: string;
  limit: number;
  type: string;
}

/**
 * Library API 카운트 정보
 */
export interface LibraryResponseCounts {
  favorites?: number;
  regular?: number;
  clips?: number;
  projects?: number;
  uploads?: number;
}

/**
 * Library 데이터 응답에서 반환되는 전체 데이터 구조
 */
export interface LibraryDataResponse {
  clipItems: LibraryVideo[];
  projectItems: LibraryProject[];
  uploadItems: UserUploadedVideo[];
  counts: LibraryCounts;
}