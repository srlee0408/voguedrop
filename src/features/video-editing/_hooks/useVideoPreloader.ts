import { useEffect, useState } from 'react';
import { shouldPreloadVideo, createSafeVideoElement } from '@/shared/utils/video-preload-utils';

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
      
      // 프리로드 가능 여부 확인
      if (!shouldPreloadVideo(url)) {
        setPreloadStatus(prev => ({
          ...prev,
          [url]: { loading: false, loaded: false, error: new Error('Preload not suitable') }
        }));
        return;
      }

      const video = createSafeVideoElement(url);
      if (!video) {
        setPreloadStatus(prev => ({
          ...prev,
          [url]: { loading: false, loaded: false, error: new Error('Failed to create video element') }
        }));
        return;
      }
      
      // 로드 성공 핸들러
      const handleCanPlay = () => {
        setPreloadStatus(prev => ({
          ...prev,
          [url]: { loading: false, loaded: true, error: null }
        }));
      };

      // 에러 핸들러 (조용한 실패)
      const handleError = () => {
        // 개발 환경에서만 에러 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Video preload failed (silently handled): ${url}`);
        }
        
        setPreloadStatus(prev => ({
          ...prev,
          [url]: { 
            loading: false, 
            loaded: false, 
            error: new Error(`Network error or CORS issue`) 
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
  }, [JSON.stringify(videoUrls)]); // URL 배열 자체가 변경될 때만 실행

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