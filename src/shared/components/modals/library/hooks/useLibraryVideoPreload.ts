import { useEffect, useState, useCallback } from 'react';
import { LibraryVideo } from '@/shared/types/video-editor';
import { useVideoPreloader } from '@/app/video-editor/_hooks/useVideoPreloader';

interface UseLibraryVideoPreloadOptions {
  /** 활성화 여부 */
  enabled?: boolean;
  /** 프리로드할 상위 아이템 수 (기본값: 4) */
  topCount?: number;
}

/**
 * 라이브러리 비디오 프리로딩을 위한 커스텀 훅
 * 기존 useVideoPreloader를 라이브러리 모달에 특화하여 활용
 */
export function useLibraryVideoPreload(
  items: LibraryVideo[], 
  options: UseLibraryVideoPreloadOptions = {}
) {
  const { enabled = true, topCount = 4 } = options;
  const [preloadedUrls, setPreloadedUrls] = useState<Set<string>>(new Set());
  const [networkAware, setNetworkAware] = useState(true);
  
  // 네트워크 상태 감지
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as unknown as { connection?: { effectiveType: string; addEventListener: (event: string, handler: () => void) => void; removeEventListener: (event: string, handler: () => void) => void } }).connection;
      if (connection) {
        const updateNetworkStatus = () => {
          // 느린 연결에서는 프리로드 비활성화
          setNetworkAware(
            !['slow-2g', '2g'].includes(connection.effectiveType)
          );
        };
        
        updateNetworkStatus();
        connection.addEventListener('change', updateNetworkStatus);
        
        return () => {
          connection.removeEventListener('change', updateNetworkStatus);
        };
      }
    }
  }, []);
  
  // 상위 비디오 URL 추출 (네트워크 상태 고려)
  const topVideoUrls = items
    .slice(0, topCount)
    .map(item => item.output_video_url)
    .filter((url): url is string => !!url);
  
  // 기존 useVideoPreloader 훅 활용 (네트워크 상태 고려)
  const { preloadStatus, allLoaded } = useVideoPreloader(
    enabled && networkAware ? topVideoUrls : []
  );
  
  // 프리로드 완료된 URL 추적
  useEffect(() => {
    const loadedUrls = new Set<string>();
    Object.entries(preloadStatus).forEach(([url, status]) => {
      if (status.loaded) {
        loadedUrls.add(url);
      }
    });
    setPreloadedUrls(loadedUrls);
  }, [preloadStatus]);
  
  // URL 유효성 검사
  const isValidVideoUrl = useCallback((url: string | undefined): boolean => {
    if (!url) return false;
    
    try {
      const urlObj = new URL(url);
      // HTTPS만 허용하고, 알려진 비디오 호스트만 허용
      if (urlObj.protocol !== 'https:') return false;
      
      // 허용된 호스트 목록
      const allowedHosts = [
        'fal.media',
        'v3.fal.media', 
        'supabase.co',
        'storage.googleapis.com',
        'amazonaws.com'
      ];
      
      return allowedHosts.some(host => urlObj.hostname.includes(host));
    } catch {
      return false;
    }
  }, []);
  
  // 특정 비디오가 프리로드되었는지 확인
  const isVideoPreloaded = (url: string | undefined): boolean => {
    if (!url || !isValidVideoUrl(url)) return false;
    return preloadedUrls.has(url);
  };
  
  // 프리로드 통계
  const stats = {
    totalVideos: topVideoUrls.length,
    loadedCount: preloadedUrls.size,
    loadingCount: Object.values(preloadStatus).filter(s => s.loading).length,
    allLoaded,
    loadingProgress: topVideoUrls.length > 0 
      ? Math.round((preloadedUrls.size / topVideoUrls.length) * 100)
      : 0
  };
  
  return {
    isVideoPreloaded,
    preloadStatus,
    stats,
    preloadedUrls: Array.from(preloadedUrls)
  };
}