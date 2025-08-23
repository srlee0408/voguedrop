import { useCallback, useEffect } from 'react';
import { LibraryVideo, LibraryProject, UserUploadedVideo } from '@/shared/types/video-editor';
import { LibraryCounts } from '@/shared/types/library-modal';
import { useAuth } from '@/shared/lib/auth/AuthContext';
import { 
  useCombinedLibraryData, 
  useUpdateUploadItems, 
  useUpdateCounts
} from './useLibraryQuery';
import { useLibraryPrefetch } from './useLibraryPrefetch';

/**
 * useLibraryData 훅의 반환 타입
 * PROJECT_GUIDE.md 패턴에 따른 명시적 타입 정의
 */
interface UseLibraryDataReturn {
  /** AI 생성 클립 아이템들 */
  clipItems: LibraryVideo[];
  /** 프로젝트 아이템들 */
  projectItems: LibraryProject[];
  /** 업로드된 비디오 아이템들 */
  uploadItems: UserUploadedVideo[];
  /** 각 카테고리별 카운트 */
  counts: LibraryCounts;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 메시지 (string 또는 null) */
  error: string | null;
  /** 데이터 재요청 함수 */
  refetch: () => Promise<void>;
  /** 업로드 아이템 업데이트 함수 */
  updateUploadItems: (newItem: UserUploadedVideo) => void;
  /** 카운트 업데이트 함수 */
  updateCounts: (key: keyof LibraryCounts, delta: number) => void;
}

/**
 * Library 데이터를 관리하는 커스텀 훅
 * React Query 기반으로 리팩토링됨 (PROJECT_GUIDE.md 준수)
 * Progressive Enhancement 로딩과 프리페칭 최적화 포함
 * @param isOpen - 모달이 열려있는지 여부  
 * @param loadClips - 클립 데이터 로딩 여부 (기본값: true)
 * @returns Library 데이터와 관련 상태/메서드
 */
export function useLibraryData(isOpen: boolean, loadClips: boolean = true): UseLibraryDataReturn {
  const { user } = useAuth();
  const { getPrefetchStatus, prefetchFullData } = useLibraryPrefetch();
  
  // Progressive Enhancement: 모달이 열릴 때 필요한 경우에만 전체 데이터 로드
  useEffect(() => {
    if (isOpen && user) {
      const status = getPrefetchStatus();
      
      // 전체 데이터가 아직 프리페칭되지 않은 경우에만 로드
      if (!status.fullData) {
        prefetchFullData();
      }
    }
  }, [isOpen, user, getPrefetchStatus, prefetchFullData]);
  
  // React Query를 사용한 데이터 페칭 (프리페칭된 데이터가 있으면 즉시 사용)
  const {
    data,
    isLoading,
    error: queryError,
    refetch
  } = useCombinedLibraryData(isOpen && !!user);
  
  // Mutation hooks
  const updateUploadItemsMutation = useUpdateUploadItems();
  const updateCountsMutation = useUpdateCounts();
  
  // 데이터 기본값 설정 (loadClips 플래그에 따라 클립 로딩 여부 결정)
  const clipItems = loadClips ? (data?.clipItems || []) : [];
  const projectItems = data?.projectItems || [];
  const uploadItems = data?.uploadItems || [];
  const counts = data?.counts || { favorites: 0, clips: 0, projects: 0, uploads: 0 };
  
  // 에러 처리
  const error = queryError instanceof Error ? queryError.message : null;

  // 업로드 아이템 추가 메서드 (Optimistic Update 사용)
  const updateUploadItems = useCallback((newItem: UserUploadedVideo) => {
    updateUploadItemsMutation.mutate(newItem);
  }, [updateUploadItemsMutation]);

  // 카운트 업데이트 메서드 (Optimistic Update 사용)
  const updateCounts = useCallback((key: keyof LibraryCounts, delta: number) => {
    updateCountsMutation.mutate({ key, delta });
  }, [updateCountsMutation]);
  
  // 수동 리페치 래퍼
  const handleRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    clipItems,
    projectItems,
    uploadItems,
    counts,
    isLoading,
    error,
    refetch: handleRefetch,
    updateUploadItems,
    updateCounts
  };
}