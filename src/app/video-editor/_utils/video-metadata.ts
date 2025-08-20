/**
 * 비디오 파일에서 메타데이터를 추출하는 유틸리티 함수
 * HTML5 Video API를 사용하여 클라이언트 사이드에서 처리
 */

export interface VideoMetadata {
  duration: number;
  aspectRatio: string;
  width: number;
  height: number;
}

/**
 * 비디오 파일에서 메타데이터 추출
 * @param file - 비디오 파일
 * @returns 비디오 메타데이터 (duration, aspectRatio, width, height)
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.src = url;
    video.preload = 'metadata';
    
    const handleLoadedMetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = video.duration;
      
      // 유효성 검사
      if (!width || !height || !isFinite(duration)) {
        cleanup();
        reject(new Error('Invalid video metadata'));
        return;
      }
      
      // Aspect ratio 계산
      const ratio = width / height;
      let aspectRatio = `${width}:${height}`;
      
      // 일반적인 비율로 정규화 (tolerance: 0.1)
      if (Math.abs(ratio - 16/9) < 0.1) {
        aspectRatio = '16:9';
      } else if (Math.abs(ratio - 9/16) < 0.1) {
        aspectRatio = '9:16';
      } else if (Math.abs(ratio - 1) < 0.1) {
        aspectRatio = '1:1';
      } else if (Math.abs(ratio - 4/3) < 0.1) {
        aspectRatio = '4:3';
      } else if (Math.abs(ratio - 3/4) < 0.1) {
        aspectRatio = '3:4';
      } else if (Math.abs(ratio - 21/9) < 0.1) {
        aspectRatio = '21:9'; // 울트라와이드
      } else if (Math.abs(ratio - 9/21) < 0.1) {
        aspectRatio = '9:21';
      }
      
      cleanup();
      resolve({ 
        duration: Math.round(duration * 100) / 100, // 소수점 2자리
        aspectRatio, 
        width, 
        height 
      });
    };
    
    const handleError = () => {
      cleanup();
      reject(new Error('Failed to load video metadata'));
    };
    
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
      URL.revokeObjectURL(url);
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);
    
    // 타임아웃 설정 (10초)
    setTimeout(() => {
      cleanup();
      reject(new Error('Video metadata extraction timeout'));
    }, 10000);
  });
}

/**
 * 비디오 길이를 포맷팅 (초 -> mm:ss)
 * @param seconds - 초 단위 길이
 * @returns 포맷된 시간 문자열
 */
export function formatVideoDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * 파일 크기를 포맷팅 (bytes -> MB)
 * @param bytes - 바이트 단위 크기
 * @returns 포맷된 크기 문자열
 */
export function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * 비디오 파일의 첫 프레임을 썸네일로 추출
 * @param file - 비디오 파일
 * @param quality - JPEG 품질 (0-1, 기본값 0.8)
 * @returns 썸네일 Blob
 */
export async function extractVideoThumbnail(file: File, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const url = URL.createObjectURL(file);
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    
    video.src = url;
    video.crossOrigin = 'anonymous';
    
    const handleLoadedData = () => {
      // 비디오가 로드되면 첫 프레임 시간으로 이동
      video.currentTime = 0.1; // 0.1초 지점 (첫 프레임이 검은 화면일 수 있으므로)
    };
    
    const handleSeeked = () => {
      // Canvas 크기를 비디오 크기에 맞춤 (최대 640px 너비로 제한)
      const maxWidth = 640;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      // 비디오 프레임을 Canvas에 그리기
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Canvas를 Blob으로 변환
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail blob'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    const handleError = () => {
      cleanup();
      reject(new Error('Failed to load video for thumbnail extraction'));
    };
    
    const cleanup = () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      URL.revokeObjectURL(url);
    };
    
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);
    
    // 타임아웃 설정 (10초)
    setTimeout(() => {
      cleanup();
      reject(new Error('Thumbnail extraction timeout'));
    }, 10000);
  });
}