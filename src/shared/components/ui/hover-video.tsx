/**
 * HoverVideo - 호버 시 영상 재생 UI 컴포넌트
 * 
 * 주요 역할:
 * 1. 마우스 호버 시 자동으로 영상 재생 시작
 * 2. 썸네일과 영상 간의 부드러운 전환 효과
 * 3. 다양한 재생 모드와 표시 방식 지원
 * 4. 영상 로딩 상태 관리 및 버퍼링 표시
 * 
 * 핵심 특징:
 * - video-first/thumbnail-first 표시 모드 선택
 * - pause/stop 호버 해제 동작 선택
 * - 썸네일 object-fit 스타일 제어 (cover/contain)
 * - 영상 프리로딩 지원으로 빠른 재생 시작
 * - 로딩 인디케이터 및 폴백 콘텐츠 지원
 * 
 * 주의사항:
 * - 영상 파일 크기가 클 경우 초기 로딩 지연 가능
 * - 모바일에서는 autoplay 정책에 따라 재생 제한
 * - 다수의 HoverVideo가 동시에 재생되면 성능 저하
 * - 외부 호버 상태(isParentHovering)로 제어 가능
 */
"use client"

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

interface HoverVideoProps {
  src: string
  className?: string
  thumbnailSrc?: string // 썸네일 URL (Library용)
  showMode?: 'video-first' | 'thumbnail-first' // 표시 모드
  pauseMode?: 'pause' | 'stop' // 호버 해제 시 동작
  thumbnailObjectFit?: 'cover' | 'contain' // 썸네일 object-fit 스타일 (기본값: cover)
  fallbackContent?: React.ReactNode
  isParentHovering?: boolean
  isPreloaded?: boolean
  onLoading?: (loading: boolean) => void
  showBufferingIndicator?: boolean // 좌측 상단 버퍼링 인디케이터 표시 여부
}

export function HoverVideo({
  src,
  className = "",
  thumbnailSrc,
  showMode = 'video-first', // 기본값: Effect Gallery 방식
  pauseMode = 'pause', // 기본값: 일시정지
  thumbnailObjectFit = 'cover', // 기본값: cover (기존 동작 유지)
  fallbackContent,
  isParentHovering,
  isPreloaded = false,
  onLoading,
  showBufferingIndicator = false
}: HoverVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [localHover, setLocalHover] = useState(false)

  // 하이브리드 hover 상태: isParentHovering이 제공되면 사용, 아니면 자체 hover 사용
  const isHovered = isParentHovering !== undefined ? isParentHovering : localHover

  // 프리로딩 효과: 프리로드된 비디오는 미리 전체 비디오 로드
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isPreloaded) return

    // 프리로드된 경우 전체 비디오 데이터 미리 로드 (딜레이 해결)
    video.preload = "auto"
    video.load()
    
    // 미리 버퍼링을 시작하여 호버 시 즉시 재생 가능하도록 함
    const preloadPromise = video.play()
    preloadPromise.then(() => {
      video.pause()
      video.currentTime = 0
    }).catch(() => {
      // 자동재생 실패 시 무시 (일반적인 브라우저 정책)
    })
  }, [isPreloaded])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isHovered) {
      if (isPreloaded && video.readyState >= 3) {
        // 프리로드되고 충분히 버퍼링된 경우 즉시 재생 (딜레이 없음)
        setIsLoading(false)
        onLoading?.(false)
        video.play().catch(() => {
          // 자동재생 실패 시 무시
        })
      } else {
        // 일반적인 경우 로딩 상태 표시
        setIsLoading(true)
        onLoading?.(true)
        
        const playPromise = video.play()
        playPromise.then(() => {
          setIsLoading(false)
          onLoading?.(false)
        }).catch(() => {
          setIsLoading(false)
          onLoading?.(false)
        })
      }
    } else {
      video.pause()
      
      // pauseMode에 따른 동작 분기
      if (pauseMode === 'stop') {
        video.currentTime = 0 // 처음으로 되돌리기 (Library Modal)
      }
      // pauseMode === 'pause'인 경우 첫 프레임 유지 (Effect Gallery)
      
      setIsLoading(false)
      onLoading?.(false)
    }
  }, [isHovered, isPreloaded, pauseMode, onLoading])

  // URL에서 쿼리 파라미터를 제거하고 비디오 확장자 확인
  const cleanUrl = src.split('?')[0];
  const isVideo = cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov') || cleanUrl.includes('video')

  // 버퍼링 인디케이터 컴포넌트 (좌측 상단 고정)
  const BufferingIndicator = () => {
    if (!showBufferingIndicator || !isLoading || !isHovered) return null;
    
    return (
      <div className="absolute top-2 left-2 z-50 bg-black/70 backdrop-blur-sm rounded-full p-1 flex items-center justify-center">
        <Loader2 className="w-3 h-3 animate-spin text-white" />
      </div>
    );
  };

  // showMode별 렌더링 분기
  if (showMode === 'thumbnail-first' && thumbnailSrc) {
    // Library Modal 방식: 썸네일 기본, 호버 시 비디오 오버레이
    return (
      <div
        className="relative cursor-pointer flex items-center justify-center w-full h-full"
        onMouseEnter={() => isParentHovering === undefined && setLocalHover(true)}
        onMouseLeave={() => isParentHovering === undefined && setLocalHover(false)}
      >
        {/* 기본 썸네일 */}
        <Image
          src={thumbnailSrc}
          alt=""
          width={0}
          height={0}
          sizes="100vw"
          className={className}
          style={{ width: '100%', height: '100%', objectFit: thumbnailObjectFit }}
        />
        
        {/* 호버 시 비디오 오버레이 */}
        {isHovered && isVideo && (
          <div className="absolute inset-0">
            <video
              ref={videoRef}
              src={src}
              className={className}
              muted
              loop
              playsInline
              preload="metadata"
              onLoadStart={() => {
                setIsLoading(true)
                onLoading?.(true)
              }}
              onWaiting={() => {
                setIsLoading(true)
                onLoading?.(true)
              }}
              onCanPlay={() => {
                setIsLoading(false)
                onLoading?.(false)
              }}
              onPlaying={() => {
                setIsLoading(false)
                onLoading?.(false)
              }}
              onError={() => {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('HoverVideo load failed (silently handled):', src);
                }
                setIsLoading(false)
                onLoading?.(false)
              }}
            />
          </div>
        )}
        
        {/* 버퍼링 인디케이터 */}
        <BufferingIndicator />
        
        {!src && fallbackContent}
      </div>
    )
  }

  // video-first 모드 또는 비비디오 파일 처리
  if (!isVideo) {
    return (
      <div className="relative w-full">
        <Image
          src={src}
          alt=""
          width={0}
          height={0}
          sizes="100vw"
          className={className}
          style={{ width: '100%', height: 'auto' }}
        />
      </div>
    )
  }

  // Effect Gallery 방식: 비디오가 항상 표시, 호버 시 재생
  return (
    <div
      className="relative cursor-pointer flex items-center justify-center w-full h-full"
      onMouseEnter={() => isParentHovering === undefined && setLocalHover(true)}
      onMouseLeave={() => isParentHovering === undefined && setLocalHover(false)}
    >
      <video
        ref={videoRef}
        src={src}
        className={className}
        muted
        loop
        playsInline
        preload="metadata"
        onLoadStart={() => {
          setIsLoading(true)
          onLoading?.(true)
        }}
        onWaiting={() => {
          setIsLoading(true)
          onLoading?.(true)
        }}
        onCanPlay={() => {
          setIsLoading(false)
          onLoading?.(false)
        }}
        onPlaying={() => {
          setIsLoading(false)
          onLoading?.(false)
        }}
        onError={() => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('HoverVideo load failed (silently handled):', src);
          }
          setIsLoading(false)
          onLoading?.(false)
        }}
      />
      
      {/* 버퍼링 인디케이터 */}
      <BufferingIndicator />
      
      {!src && fallbackContent}
    </div>
  )
}