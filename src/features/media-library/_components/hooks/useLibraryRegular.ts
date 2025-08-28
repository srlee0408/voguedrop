/**
 * useLibraryRegular - 일반 클립 무한 스크롤 데이터 관리 훅
 * 
 * 주요 역할:
 * 1. 즐겨찾기가 아닌 일반 클립들의 무한 스크롤 페이지네이션
 * 2. cursor 기반 페이지네이션으로 성능 최적화된 데이터 로딩
 * 3. 캐시 우선 정책으로 프리페칭된 데이터 활용 극대화
 * 4. 에러 처리 및 재시도 로직 포함한 안정적인 데이터 페칭
 * 
 * 핵심 특징:
 * - useInfiniteQuery 기반 React Query 패턴 준수
 * - 15분 캐시 유지로 프리페칭 효율성 극대화
 * - backward compatibility를 위한 API 응답 형태 지원
 * - fetchNextPage/refetch 래퍼 함수로 타입 안전성 보장
 * - 플래튼 데이터와 총 개수 계산 자동 처리
 * 
 * 주의사항:
 * - 일반 클립만 대상으로 하며 즐겨찾기는 별도 훅 사용
 * - cursor 페이지네이션이므로 nextCursor 관리 중요
 * - 캐시 우선 정책으로 네트워크 요청 최소화
 */
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { LibraryResponse } from '@/shared/types/library-modal';
import { LibraryVideo } from '@/shared/types/video-editor';

/**
 * useLibraryRegular 훅 옵션
 * PROJECT_GUIDE.md 패턴에 따른 명시적 인터페이스 정의
 */
interface UseLibraryRegularOptions {
  enabled?: boolean;
  limit?: number;
}

/**
 * useLibraryRegular 훅 반환 타입
 * PROJECT_GUIDE.md 패턴에 따른 명시적 반환 타입 정의
 */
interface UseLibraryRegularReturn {
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
 * 일반 클립을 페이지별로 가져오는 API 함수
 * PROJECT_GUIDE.md API 패턴에 따른 명시적 타입 정의
 */
async function fetchRegularPage(
  pageParam: string | undefined,
  limit: number
): Promise<LibraryResponse> {
  const params = new URLSearchParams({
    limit: limit.toString()
  });
  
  if (pageParam) {
    params.set('cursor', pageParam);
  }

  const response = await fetch(`/api/canvas/library/regular?${params}`);
  
  if (!response.ok) {
    const errorMessage = `Failed to fetch regular clips (${response.status})`;
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * 일반 클립 데이터를 관리하는 커스텀 훅
 * PROJECT_GUIDE.md React Query 패턴 준수
 * @param options 훅 설정 옵션
 * @returns 일반 클립 데이터와 관련 상태/메서드
 */
export function useLibraryRegular({
  enabled = true,
  limit = 20
}: UseLibraryRegularOptions = {}): UseLibraryRegularReturn {
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
    queryKey: ['library', 'regular', limit],
    queryFn: ({ pageParam }) => fetchRegularPage(pageParam, limit),
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
    page.regular || page.clips || [] // backward compatibility
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