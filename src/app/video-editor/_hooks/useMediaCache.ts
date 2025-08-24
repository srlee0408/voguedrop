import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { mediaCache } from '@/lib/cache/media-cache';
import { extractVideoMetadata, extractVideoThumbnail } from '../_utils/video-metadata';

interface MediaLoadStatus {
  loading: boolean;
  loaded: boolean;
  cached: boolean;
  error: Error | null;
  progress?: number;
}

interface MediaCacheState {
  [url: string]: MediaLoadStatus;
}

interface UseMediaCacheOptions {
  /** 자동 프리로드 여부 (기본: true) */
  autoPreload?: boolean;
  /** 썸네일 추출 여부 (비디오만, 기본: true) */
  extractThumbnails?: boolean;
  /** 메타데이터 추출 여부 (비디오만, 기본: true) */
  extractMetadata?: boolean;
  /** 최대 동시 로딩 수 (기본: 3) */
  maxConcurrent?: number;
}

interface UseMediaCacheReturn {
  /** 각 URL별 로드 상태 */
  loadStatus: MediaCacheState;
  /** 모든 미디어가 로드 완료되었는지 여부 */
  allLoaded: boolean;
  /** 캐시에서 로드된 미디어 수 */
  cachedCount: number;
  /** 로딩 중인 미디어 수 */
  loadingCount: number;
  /** 로드된 미디어 수 */
  loadedCount: number;
  /** 전체 미디어 수 */
  totalCount: number;
  /** 수동으로 특정 URL 프리로드 */
  preloadUrl: (url: string) => Promise<void>;
  /** 캐시에서 미디어 조회 */
  getCachedMedia: (url: string) => Promise<Blob | null>;
}

/**
 * 향상된 미디어 캐싱 훅
 * 
 * 기존 useVideoPreloader를 확장하여 IndexedDB 기반 캐싱,
 * 메타데이터 추출, 썸네일 생성 등의 기능을 제공합니다.
 * 
 * @param urls - 프리로드할 미디어 URL 배열
 * @param options - 캐싱 옵션
 * @returns 미디어 로드 상태 및 유틸리티 함수
 */
export function useMediaCache(
  urls: (string | undefined)[],
  options: UseMediaCacheOptions = {}
): UseMediaCacheReturn {
  const {
    autoPreload = true,
    extractThumbnails = true,
    extractMetadata = true,
    maxConcurrent = 3
  } = options;

  const [loadStatus, setLoadStatus] = useState<MediaCacheState>({});
  const [initialized, setInitialized] = useState(false);
  const loadingQueueRef = useRef<string[]>([]);
  const activeLoadsRef = useRef<Set<string>>(new Set());

  // 유효한 URL만 필터링 (메모이제이션으로 무한 리렌더링 방지)
  const validUrls = useMemo(() => {
    return urls.filter((url): url is string => Boolean(url));
  }, [urls]);

  // 미디어 타입 감지
  const getMediaType = useCallback((url: string): 'video' | 'audio' | 'image' => {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(extension || '')) {
      return 'video';
    } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension || '')) {
      return 'audio';
    } else {
      return 'image';
    }
  }, []);

  // 캐시 초기화
  useEffect(() => {
    let mounted = true;

    const initializeCache = async () => {
      try {
        await mediaCache.init();
        if (mounted) {
          setInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize media cache:', error);
      }
    };

    initializeCache();

    return () => {
      mounted = false;
    };
  }, []);

  // URL 상태 초기화
  useEffect(() => {
    if (!initialized || validUrls.length === 0) {
      setLoadStatus({});
      return;
    }

    // 새로운 URL들에 대해 초기 상태 설정
    setLoadStatus(prev => {
      const newState = { ...prev };
      
      validUrls.forEach(url => {
        if (!newState[url]) {
          newState[url] = {
            loading: false,
            loaded: false,
            cached: false,
            error: null
          };
        }
      });

      // 더 이상 사용하지 않는 URL 제거
      Object.keys(newState).forEach(url => {
        if (!validUrls.includes(url)) {
          delete newState[url];
        }
      });

      return newState;
    });
  }, [initialized, validUrls]); // validUrls 의존성 추가

  // 단일 URL 프리로드 함수
  const preloadUrl = useCallback(async (url: string): Promise<void> => {
    if (!initialized) {
      await mediaCache.init();
    }

    const mediaType = getMediaType(url);

    // 상태 업데이트: 로딩 시작
    setLoadStatus(prev => ({
      ...prev,
      [url]: {
        ...prev[url],
        loading: true,
        error: null,
        progress: 0
      }
    }));

    try {
      // 먼저 캐시에서 확인
      let cachedEntry;
      if (mediaType === 'video') {
        cachedEntry = await mediaCache.getVideo(url);
      } else if (mediaType === 'audio') {
        cachedEntry = await mediaCache.getAudio(url);
      } else {
        cachedEntry = await mediaCache.getImage(url);
      }

      if (cachedEntry) {
        // 캐시 히트
        setLoadStatus(prev => ({
          ...prev,
          [url]: {
            loading: false,
            loaded: true,
            cached: true,
            error: null
          }
        }));
        return;
      }

      // 캐시 미스 - 새로 로드
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();

      // 비디오인 경우 메타데이터와 썸네일 추출
      if (mediaType === 'video') {
        let metadata;
        let thumbnail;

        if (extractMetadata) {
          try {
            // Blob을 File로 변환하여 메타데이터 추출
            const file = new File([blob], 'video.mp4', { type: blob.type });
            metadata = await extractVideoMetadata(file);
            
            setLoadStatus(prev => ({
              ...prev,
              [url]: { ...prev[url], progress: 50 }
            }));
          } catch (error) {
            console.warn('Failed to extract video metadata:', error);
          }
        }

        if (extractThumbnails) {
          try {
            const file = new File([blob], 'video.mp4', { type: blob.type });
            thumbnail = await extractVideoThumbnail(file);
            
            setLoadStatus(prev => ({
              ...prev,
              [url]: { ...prev[url], progress: 75 }
            }));
          } catch (error) {
            console.warn('Failed to extract video thumbnail:', error);
          }
        }

        // 캐시에 저장
        await mediaCache.setVideo(url, blob, metadata, thumbnail);
      } else if (mediaType === 'audio') {
        // 오디오 웨이브폼은 나중에 필요시 구현
        await mediaCache.setAudio(url, blob);
      } else {
        await mediaCache.setImage(url, blob);
      }

      // 상태 업데이트: 로딩 완료
      setLoadStatus(prev => ({
        ...prev,
        [url]: {
          loading: false,
          loaded: true,
          cached: false, // 새로 로드된 것이므로
          error: null
        }
      }));

    } catch (error) {
      console.error(`Failed to preload ${url}:`, error);
      
      setLoadStatus(prev => ({
        ...prev,
        [url]: {
          loading: false,
          loaded: false,
          cached: false,
          error: error instanceof Error ? error : new Error(`Failed to load: ${url}`)
        }
      }));
    } finally {
      activeLoadsRef.current.delete(url);
      // processQueue 호출을 즉시 실행하여 의존성 순환 방지
      setTimeout(() => {
        while (
          loadingQueueRef.current.length > 0 && 
          activeLoadsRef.current.size < maxConcurrent
        ) {
          const nextUrl = loadingQueueRef.current.shift();
          if (nextUrl && !activeLoadsRef.current.has(nextUrl)) {
            activeLoadsRef.current.add(nextUrl);
            preloadUrl(nextUrl);
          }
        }
      }, 0);
    }
  }, [initialized, getMediaType, extractMetadata, extractThumbnails]);

  // 큐 처리 함수
  const processQueue = useCallback(() => {
    while (
      loadingQueueRef.current.length > 0 && 
      activeLoadsRef.current.size < maxConcurrent
    ) {
      const url = loadingQueueRef.current.shift();
      if (url && !activeLoadsRef.current.has(url)) {
        activeLoadsRef.current.add(url);
        preloadUrl(url);
      }
    }
  }, [maxConcurrent]);

  // 자동 프리로드 처리
  useEffect(() => {
    if (!autoPreload || !initialized || validUrls.length === 0) {
      return;
    }

    // 아직 로드되지 않은 URL들을 큐에 추가
    const urlsToLoad = validUrls.filter(url => {
      const status = loadStatus[url];
      return status && !status.loaded && !status.loading && !status.error;
    });

    if (urlsToLoad.length === 0) return;

    // 큐에 추가 (중복 방지)
    urlsToLoad.forEach(url => {
      if (!loadingQueueRef.current.includes(url) && !activeLoadsRef.current.has(url)) {
        loadingQueueRef.current.push(url);
      }
    });

    processQueue();
  }, [autoPreload, initialized, validUrls, loadStatus, processQueue]);

  // 캐시에서 미디어 조회 함수
  const getCachedMedia = useCallback(async (url: string): Promise<Blob | null> => {
    if (!initialized) return null;

    const mediaType = getMediaType(url);
    let entry;

    if (mediaType === 'video') {
      entry = await mediaCache.getVideo(url);
    } else if (mediaType === 'audio') {
      entry = await mediaCache.getAudio(url);
    } else {
      entry = await mediaCache.getImage(url);
    }

    return entry?.blob || null;
  }, [initialized, getMediaType]);

  // 통계 계산
  const cachedCount = Object.values(loadStatus).filter(s => s.cached).length;
  const loadingCount = Object.values(loadStatus).filter(s => s.loading).length;
  const loadedCount = Object.values(loadStatus).filter(s => s.loaded).length;
  const totalCount = validUrls.length;
  const allLoaded = totalCount > 0 && loadedCount === totalCount;

  return {
    loadStatus,
    allLoaded,
    cachedCount,
    loadingCount,
    loadedCount,
    totalCount,
    preloadUrl,
    getCachedMedia
  };
}