import { useCallback } from 'react';
import { LibraryVideo, LibraryProject, UserUploadedVideo } from '@/shared/types/video-editor';
import { LibraryCounts } from '@/shared/types/library-modal';
import { useAuth } from '@/shared/lib/auth/AuthContext';
import { 
  useCombinedLibraryData, 
  useUpdateUploadItems, 
  useUpdateCounts
} from './useLibraryQuery';

interface UseLibraryDataReturn {
  clipItems: LibraryVideo[];
  projectItems: LibraryProject[];
  uploadItems: UserUploadedVideo[];
  counts: LibraryCounts;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateUploadItems: (newItem: UserUploadedVideo) => void;
  updateCounts: (key: keyof LibraryCounts, delta: number) => void;
}

/**
 * Library 데이터를 관리하는 커스텀 훅
 * React Query 기반으로 리팩토링됨 (PROJECT_GUIDE.md 준수)
 * @param isOpen - 모달이 열려있는지 여부
 * @returns Library 데이터와 관련 메서드
 */
export function useLibraryData(isOpen: boolean): UseLibraryDataReturn {
  const { user } = useAuth();
  
  // React Query를 사용한 데이터 페칭
  const {
    data,
    isLoading,
    error: queryError,
    refetch
  } = useCombinedLibraryData(isOpen && !!user);
  
  // Mutation hooks
  const updateUploadItemsMutation = useUpdateUploadItems();
  const updateCountsMutation = useUpdateCounts();
  
  // 데이터 기본값 설정
  const clipItems = data?.clipItems || [];
  const projectItems = data?.projectItems || [];
  const uploadItems = data?.uploadItems || [];
  const counts = data?.counts || { clips: 0, projects: 0, uploads: 0 };
  
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