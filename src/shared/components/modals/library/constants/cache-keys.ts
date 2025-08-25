/**
 * 통합된 Library 캐시 키 관리
 * 모든 Library 관련 쿼리가 동일한 키 체계를 사용하도록 통합
 */

export const LIBRARY_CACHE_KEYS = {
  // 기본 키
  base: 'library' as const,
  
  // 클립 관련 키
  clips: {
    all: () => ['library', 'clips'] as const,
    favorites: (limit?: number) => {
      const key = ['library', 'clips', 'favorites', limit].filter(x => x !== undefined);
      return key as readonly (string | number)[];
    },
    regular: (limit?: number) => {
      const key = ['library', 'clips', 'regular', limit].filter(x => x !== undefined);
      return key as readonly (string | number)[];
    },
  },
  
  // 프로젝트 키
  projects: {
    all: () => ['library', 'projects'] as const,
    withVideo: (limit?: number) => {
      const key = ['library', 'projects', 'with-video', limit].filter(x => x !== undefined);
      return key as readonly (string | number)[];
    },
  },
  
  // 업로드 키
  uploads: {
    all: () => ['library', 'uploads'] as const,
    byType: (type: string, limit?: number) => {
      const key = ['library', 'uploads', type, limit].filter(x => x !== undefined);
      return key as readonly (string | number)[];
    },
  },
  
  // 통합 데이터 키
  combined: {
    all: (limit?: number) => {
      const key = ['library', 'combined', limit].filter(x => x !== undefined);
      return key as readonly (string | number)[];
    },
    infinite: (limit?: number) => {
      const key = ['library', 'combined', 'infinite', limit].filter(x => x !== undefined);
      return key as readonly (string | number)[];
    },
  },
  
  // 무한 스크롤 키 (기존 호환성을 위해 유지)
  infinite: {
    clips: (type: 'favorites' | 'regular', limit?: number) => {
      const key = ['library', 'clips', type, 'infinite', limit].filter(x => x !== undefined);
      return key as readonly (string | number)[];
    },
    projects: (limit?: number) => {
      const key = ['library', 'projects', 'infinite', limit].filter(x => x !== undefined);
      return key as readonly (string | number)[];
    },
    uploads: (limit?: number) => {
      const key = ['library', 'uploads', 'infinite', limit].filter(x => x !== undefined);
      return key as readonly (string | number)[];
    },
    combined: (limit?: number) => {
      const key = ['library', 'combined', 'infinite', limit].filter(x => x !== undefined);
      return key as readonly (string | number)[];
    },
  }
} as const;

/**
 * 캐시 키 매칭 헬퍼 함수
 */
export const isCacheKeyMatch = (queryKey: readonly unknown[], targetKey: readonly unknown[]): boolean => {
  if (queryKey.length < targetKey.length) return false;
  
  return targetKey.every((key, index) => queryKey[index] === key);
};

/**
 * 특정 데이터 타입에 관련된 모든 캐시 키를 매칭하는 predicate
 */
export const createCachePredicate = (dataType: 'clips' | 'projects' | 'uploads' | 'combined') => {
  return (query: { queryKey: readonly unknown[] }) => {
    const key = query.queryKey;
    return key[0] === 'library' && key[1] === dataType;
  };
};

/**
 * 액션별 캐시 무효화 범위 정의
 */
export const CACHE_INVALIDATION_SCOPES = {
  upload: [
    LIBRARY_CACHE_KEYS.uploads.all(),
    LIBRARY_CACHE_KEYS.combined.all(),
    LIBRARY_CACHE_KEYS.infinite.uploads(),
    LIBRARY_CACHE_KEYS.infinite.combined(),
  ],
  
  generate: [
    LIBRARY_CACHE_KEYS.clips.all(),
    LIBRARY_CACHE_KEYS.clips.favorites(),
    LIBRARY_CACHE_KEYS.clips.regular(),
    LIBRARY_CACHE_KEYS.combined.all(),
    LIBRARY_CACHE_KEYS.infinite.clips('favorites'),
    LIBRARY_CACHE_KEYS.infinite.clips('regular'),
    LIBRARY_CACHE_KEYS.infinite.combined(),
  ],
  
  favorite: [
    LIBRARY_CACHE_KEYS.clips.favorites(),
    LIBRARY_CACHE_KEYS.infinite.clips('favorites'),
  ],
  
  delete: [
    LIBRARY_CACHE_KEYS.base, // 모든 library 캐시
  ]
} as const;