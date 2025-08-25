import { useCallback, useMemo } from 'react';
import { useQueryClient, InfiniteData } from '@tanstack/react-query';
import { LIBRARY_CACHE_KEYS } from '../constants/cache-keys';
import { LibraryPage } from './useLibraryInfiniteQuery';

/**
 * 사용자 액션 타입 정의
 */
type UserActionType = 'upload' | 'generate' | 'favorite' | 'delete' | 'edit';

/**
 * 캐시 무효화 전략 인터페이스
 */
interface CacheInvalidationStrategy {
  /** 즉시 무효화할 캐시 키들 */
  immediate: readonly (readonly unknown[])[];
  /** 지연 무효화할 캐시 키들 (2초 후) */
  delayed?: readonly (readonly unknown[])[];
  /** 낙관적 업데이트를 수행할 캐시 키들 */
  optimistic?: readonly (readonly unknown[])[];
  /** 쿼리 키 패턴 기반 무효화용 predicate들 */
  predicates?: readonly ((query: { queryKey: readonly unknown[] }) => boolean)[];
}

/**
 * Smart Cache Manager 훅
 * 사용자 액션에 따른 지능적인 캐시 관리를 제공
 */
export function useSmartCacheManager() {
  const queryClient = useQueryClient();

  // 액션별 캐시 무효화 전략 매핑
  const invalidationStrategies = useMemo((): Record<UserActionType, CacheInvalidationStrategy> => ({
    upload: {
      immediate: [
        LIBRARY_CACHE_KEYS.uploads.all(),
        LIBRARY_CACHE_KEYS.combined.all(),
        LIBRARY_CACHE_KEYS.infinite.uploads(20),
        LIBRARY_CACHE_KEYS.infinite.combined(20),
      ],
      delayed: [
        LIBRARY_CACHE_KEYS.infinite.uploads(50),
        LIBRARY_CACHE_KEYS.infinite.combined(50),
      ],
    },
    generate: {
      immediate: [
        LIBRARY_CACHE_KEYS.clips.all(),
        LIBRARY_CACHE_KEYS.combined.all(),
      ],
      delayed: [
        LIBRARY_CACHE_KEYS.infinite.clips('regular'),
        LIBRARY_CACHE_KEYS.infinite.clips('favorites'),
        LIBRARY_CACHE_KEYS.infinite.combined(),
      ],
    },
    favorite: {
      // immediate 무효화 제거 - useFavorites의 낙관적 업데이트만 사용
      immediate: [],
      optimistic: [
        // 필요 시에만 백그라운드 무효화
        LIBRARY_CACHE_KEYS.combined.all(),
      ],
    },
    delete: {
      immediate: [],
      // 모든 library 관련 쿼리를 전부 무효화 (limit/세부 키 변형 포함)
      predicates: [
        (query) => query.queryKey[0] === 'library'
      ],
    },
    edit: {
      immediate: [
        LIBRARY_CACHE_KEYS.projects.all(),
        LIBRARY_CACHE_KEYS.combined.all(),
      ],
      delayed: [
        LIBRARY_CACHE_KEYS.infinite.projects(),
        LIBRARY_CACHE_KEYS.infinite.combined(),
      ],
    },
  }), []);

  /**
   * 지능적 캐시 무효화 실행
   */
  const invalidateSmartly = useCallback(async (action: UserActionType, options?: {
    targetId?: string;
    skipOptimistic?: boolean;
  }) => {
    const strategy = invalidationStrategies[action];
    if (!strategy) return;

    try {
      // 1. 즉시 무효화
      if (strategy.immediate.length > 0) {
        await Promise.all(
          strategy.immediate.map(queryKey => 
            queryClient.invalidateQueries({ queryKey })
          )
        );
      }

      // 2. 낙관적 업데이트 (필요 시)
      if (strategy.optimistic && !options?.skipOptimistic) {
        strategy.optimistic.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey, refetchType: 'none' });
        });
      }

      // 3. 지연 무효화 (네트워크 부하 분산)
      if (strategy.delayed && strategy.delayed.length > 0) {
        setTimeout(() => {
          strategy.delayed!.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey });
          });
        }, 2000);
      }

      // 4. 패턴 기반 무효화 (base와 같이 가변 세부키 전체 무효화)
      if (strategy.predicates && strategy.predicates.length > 0) {
        strategy.predicates.forEach(predicate => {
          queryClient.invalidateQueries({ predicate });
        });
      }

    } catch (error) {
      console.error(`Smart cache invalidation failed for action: ${action}`, error);
    }
  }, [queryClient, invalidationStrategies]);

  /**
   * 특정 데이터 타입에 대한 선택적 무효화
   */
  const invalidateByDataType = useCallback((dataType: 'clips' | 'projects' | 'uploads' | 'combined') => {
    const predicate = (query: { queryKey: readonly unknown[] }) => {
      const key = query.queryKey;
      return key[0] === 'library' && key[1] === dataType;
    };

    queryClient.invalidateQueries({ predicate });
  }, [queryClient]);

  /**
   * 캐시 상태 진단
   */
  const diagnoseCacheHealth = useCallback(() => {
    const cacheStats = {
      totalQueries: 0,
      staleQueries: 0,
      fetchingQueries: 0,
      errorQueries: 0,
      libraryQueries: 0,
    };

    queryClient.getQueryCache().getAll().forEach(query => {
      cacheStats.totalQueries++;

      // fetchStatus: 'idle' | 'fetching' | 'paused'
      if (query.state.fetchStatus === 'fetching') cacheStats.fetchingQueries++;
      // status: 'pending' | 'error' | 'success'
      if (query.state.status === 'error') cacheStats.errorQueries++;
      // 간단한 staleness 휴리스틱: 5분 이상 지난 데이터는 stale로 간주
      const dataUpdatedAt = typeof query.state.dataUpdatedAt === 'number' ? query.state.dataUpdatedAt : 0;
      if (Date.now() - dataUpdatedAt > 5 * 60 * 1000) cacheStats.staleQueries++;

      if (query.queryKey[0] === 'library') {
        cacheStats.libraryQueries++;
      }
    });

    return cacheStats;
  }, [queryClient]);

  /**
   * 메모리 최적화를 위한 캐시 정리
   */
  const optimizeCache = useCallback(() => {
    // 5분 이상 사용되지 않은 쿼리 제거
    queryClient.getQueryCache().getAll()
      .filter(query => {
        const lastAccessed = query.state.dataUpdatedAt;
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return lastAccessed < fiveMinutesAgo;
      })
      .forEach(query => {
        queryClient.removeQueries({ queryKey: query.queryKey });
      });

    // 가비지 컬렉션 수동 실행
    queryClient.getQueryCache().clear();
  }, [queryClient]);

  /**
   * 데이터 정합성 검증
   */
  const verifyDataIntegrity = useCallback(async (expectedData: {
    type: 'clip' | 'project' | 'upload';
    id: string;
    action: 'create' | 'update' | 'delete';
  }) => {
    try {
      const response = await fetch(`/api/canvas/library/verify/${expectedData.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: expectedData.type,
          action: expectedData.action,
        }),
      });

      if (!response.ok) {
        return { verified: false, error: 'API request failed' };
      }

      const result = await response.json();
      return { verified: result.exists, dbData: result.data };
    } catch (error) {
      console.error('Data integrity verification failed:', error);
      return { verified: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  /**
   * 캐시에서 특정 아이템 검색
   */
  const findInCache = useCallback(<T extends { id: string | number }>(
    itemId: string | number,
    cacheKey: readonly unknown[]
  ): T | null => {
    const data = queryClient.getQueryData(cacheKey) as InfiniteData<LibraryPage> | T[] | null;
    
    if (!data) return null;

    // InfiniteData 형태인 경우
    if ('pages' in data && Array.isArray(data.pages)) {
      for (const page of data.pages) {
        const foundClip = page.clips?.find(item => String(item.id) === String(itemId));
        if (foundClip) return (foundClip as unknown) as T;
        
        const foundProject = page.projects?.find(item => String(item.id) === String(itemId));
        if (foundProject) return (foundProject as unknown) as T;
        
        const foundUpload = page.uploads?.find(item => String(item.id) === String(itemId));
        if (foundUpload) return (foundUpload as unknown) as T;
      }
    }
    
    // 일반 배열인 경우
    if (Array.isArray(data)) {
      return ((data.find(item => String(item.id) === String(itemId)) as unknown) as T) || null;
    }

    return null;
  }, [queryClient]);

  return {
    invalidateSmartly,
    invalidateByDataType,
    diagnoseCacheHealth,
    optimizeCache,
    verifyDataIntegrity,
    findInCache,
  };
}

/**
 * 캐시 관리 상수
 */
export const CACHE_MANAGEMENT = {
  /** 실시간 모드 지속 시간 (5초) */
  REALTIME_DURATION: 5 * 1000,
  /** 지연 무효화 대기 시간 (2초) */
  DELAYED_INVALIDATION: 2 * 1000,
  /** 캐시 정리 주기 (5분) */
  CLEANUP_INTERVAL: 5 * 60 * 1000,
} as const;