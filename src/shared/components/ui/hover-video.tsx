"use client"

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'

interface HoverVideoProps {
  src: string
  className?: string
  thumbnailSrc?: string // 썸네일 URL (Library용)
  showMode?: 'video-first' | 'thumbnail-first' // 표시 모드
  pauseMode?: 'pause' | 'stop' // 호버 해제 시 동작
  fallbackContent?: React.ReactNode
  isParentHovering?: boolean
  isPreloaded?: boolean
  onLoading?: (loading: boolean) => void
}

export function HoverVideo({
  src,
  className = "",
  thumbnailSrc,
  showMode = 'video-first', // 기본값: Effect Gallery 방식
  pauseMode = 'pause', // 기본값: 일시정지
  fallbackContent,
  isParentHovering,
  isPreloaded = false,
  onLoading
}: HoverVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [, setIsLoading] = useState(false)
  const [localHover, setLocalHover] = useState(false)

  // 하이브리드 hover 상태: isParentHovering이 제공되면 사용, 아니면 자체 hover 사용
  const isHovered = isParentHovering !== undefined ? isParentHovering : localHover

  // 프리로딩 효과: 프리로드된 비디오는 미리 메타데이터 로드
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isPreloaded) return

    // 프리로드된 경우 메타데이터 미리 로드
    video.preload = "metadata"
    video.load()
  }, [isPreloaded])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isHovered) {
      // 호버 시작 시 로딩 상태 설정
      setIsLoading(true)
      onLoading?.(true)
      
      // 프리로드된 경우 더 빠른 재생 시작
      const playPromise = video.play()
      
      if (isPreloaded) {
        // 프리로드된 경우 로딩 상태를 더 빨리 해제
        setTimeout(() => {
          setIsLoading(false)
          onLoading?.(false)
        }, 100)
      }
      
      playPromise.catch(() => {
        // Handle autoplay failure silently
        setIsLoading(false)
        onLoading?.(false)
      })
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
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
      {!src && fallbackContent}
    </div>
  )
}