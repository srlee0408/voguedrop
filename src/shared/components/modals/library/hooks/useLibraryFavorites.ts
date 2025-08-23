import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { LibraryResponse } from '@/shared/types/library-modal';
import { LibraryVideo } from '@/shared/types/video-editor';

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
 * 즐겨찾기 클립을 페이지별로 가져오는 API 함수
 * PROJECT_GUIDE.md API 패턴에 따른 명시적 타입 정의
 */
async function fetchFavoritesPage(
  pageParam: string | undefined,
  limit: number
): Promise<LibraryResponse> {
  const params = new URLSearchParams({
    limit: limit.toString()
  });
  
  if (pageParam) {
    params.set('cursor', pageParam);
  }

  const response = await fetch(`/api/canvas/library/favorites?${params}`);
  
  if (!response.ok) {
    const errorMessage = `Failed to fetch favorite clips (${response.status})`;
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * 즐겨찾기 클립 데이터를 관리하는 커스텀 훅
 * PROJECT_GUIDE.md React Query 패턴 준수
 * @param options 훅 설정 옵션
 * @returns 즐겨찾기 클립 데이터와 관련 상태/메서드
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
    [string, string, number],
    string | undefined
  >({
    queryKey: ['library', 'favorites', limit],
    queryFn: ({ pageParam }) => fetchFavoritesPage(pageParam, limit),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => 
      lastPage.pagination?.hasNextPage ? lastPage.pagination.nextCursor : undefined,
    enabled,
    staleTime: 1000 * 60 * 15, // 15분간 캐시 유지 (프리페칭과 동일)
    gcTime: 1000 * 60 * 30,    // 30분 후 가비지 컬렉션
    refetchOnMount: false,     // 캐시 우선 사용
    refetchOnReconnect: false, // 네트워크 재연결 시 자동 refetch 비활성화
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