import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { LibraryResponse } from '@/shared/types/library-modal';
import { LibraryVideo } from '@/shared/types/video-editor';
// cache keys는 이 훅에서 직접 사용하지 않음
import { fetchFavoritesPage } from '../_services/api';

/**
 * useLibraryFavorites 훅 옵션
 * PROJECT_GUIDE.md 패턴에 따른 명시적 인터페이스 정의
 */
interface UseLibraryFavoritesOptions {
  enabled?: boolean;
  limit?: number;
}

/**
 * useLibraryFavorites 훅 반환 타입
 * PROJECT_GUIDE.md 패턴에 따른 명시적 반환 타입 정의
 */
interface UseLibraryFavoritesReturn {
  data: LibraryVideo[];
  loading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<void>;
  refetch: () => Promise<void>;
  totalCount: number;
}

/**
 * 즐겨찾기 클립 데이터를 관리하는 커스텀 훅
 * - API 서비스 사용
 * - 중앙 캐시 정책 사용
 */
export function useLibraryFavorites({
  enabled = true,
  limit = 20
}: UseLibraryFavoritesOptions = {}): UseLibraryFavoritesReturn {
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch
  } = useInfiniteQuery<
    LibraryResponse,
    Error,
    InfiniteData<LibraryResponse>,
    [string, string, string, string, number],
    string | undefined
  >({
    // 캐시 키를 통합 키 규칙과 맞춤 (clips/favorites)
    queryKey: ['library', 'clips', 'favorites', 'infinite', limit],
    queryFn: ({ pageParam }) => fetchFavoritesPage({ limit, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => 
      lastPage.pagination?.hasNextPage ? lastPage.pagination.nextCursor : undefined,
    enabled,
    // 모달을 열 때마다 실제 값을 보장하기 위해 즉시 stale 처리
    staleTime: 0,
    // 모달 첫 진입 시 0에서 점진 로딩되도록 캐시를 짧게 유지
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: false,
  });

  // 모든 페이지의 데이터를 평면화
  const flattenedData: LibraryVideo[] = data?.pages?.flatMap(page => 
    page.favorites || []
  ) || [];

  // 총 카운트 계산 (첫 번째 페이지에서 가져옴)
  const totalCount = data?.pages?.[0]?.totalCount || 0;

  const handleFetchNextPage = async (): Promise<void> => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  };

  const handleRefetch = async (): Promise<void> => {
    await refetch();
  };

  return {
    data: flattenedData,
    loading: isLoading,
    error: error as Error | null,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    fetchNextPage: handleFetchNextPage,
    refetch: handleRefetch,
    totalCount
  };
}