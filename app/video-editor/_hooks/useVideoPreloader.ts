import { useEffect, useState } from 'react';

interface PreloadStatus {
  [url: string]: {
    loading: boolean;
    loaded: boolean;
    error: Error | null;
  };
}

export function useVideoPreloader(videoUrls: (string | undefined)[]) {
  const [preloadStatus, setPreloadStatus] = useState<PreloadStatus>({});

  useEffect(() => {
    const validUrls = videoUrls.filter((url): url is string => !!url);
    
    // 비디오가 없으면 종료
    if (validUrls.length === 0) {
      setPreloadStatus({});
      return;
    }
    
    // 각 URL에 대해 초기 상태 설정 (이미 로드된 것은 건드리지 않음)
    validUrls.forEach(url => {
      setPreloadStatus(prev => {
        if (prev[url]?.loaded) {
          return prev; // 이미 로드된 경우 변경 없음
        }
        return {
          ...prev,
          [url]: prev[url] || { loading: true, loaded: false, error: null }
        };
      });
    });

    const videoElements: HTMLVideoElement[] = [];

    // 각 비디오 프리로드
    validUrls.forEach(url => {
      // 이미 로드되었으면 스킵
      if (preloadStatus[url]?.loaded) {
        return;
      }

      const video = document.createElement('video');
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      
      // 로드 성공 핸들러
      const handleCanPlay = () => {
        console.log(`Video preloaded: ${url}`);
        setPreloadStatus(prev => ({
          ...prev,
          [url]: { loading: false, loaded: true, error: null }
        }));
      };

      // 에러 핸들러
      const handleError = () => {
        console.error(`Failed to preload video: ${url}`);
        setPreloadStatus(prev => ({
          ...prev,
          [url]: { 
            loading: false, 
            loaded: false, 
            error: new Error(`Failed to load: ${url}`) 
          }
        }));
      };

      // 이벤트 리스너 추가
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      
      // 비디오 소스 설정 (프리로딩 시작)
      video.src = url;
      videoElements.push(video);
    });

    // Cleanup 함수
    return () => {
      videoElements.forEach(video => {
        video.src = '';
        video.load();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(videoUrls)]); // URL 배열이 변경될 때만 재실행

  // 통계 계산
  const loadingCount = Object.values(preloadStatus).filter(s => s.loading).length;
  const loadedCount = Object.values(preloadStatus).filter(s => s.loaded).length;
  const totalCount = videoUrls.filter(url => !!url).length;
  const allLoaded = totalCount > 0 && loadedCount === totalCount;

  return {
    preloadStatus,
    allLoaded,
    loadingCount,
    loadedCount,
    totalCount
  };
}