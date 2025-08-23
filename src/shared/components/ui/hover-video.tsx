"use client"

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'

interface HoverVideoProps {
  src: string
  className?: string
  fallbackContent?: React.ReactNode
  isParentHovering?: boolean
  isPreloaded?: boolean
  onLoading?: (loading: boolean) => void
}

export function HoverVideo({
  src,
  className = "",
  fallbackContent,
  isParentHovering = false,
  isPreloaded = false,
  onLoading
}: HoverVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [, setIsLoading] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isParentHovering) {
      // 호버 시작 시 로딩 상태 설정
      setIsLoading(true)
      onLoading?.(true)
      
      video.play().catch(() => {
        // Handle autoplay failure silently
        setIsLoading(false)
        onLoading?.(false)
      })
    } else {
      video.pause()
      video.currentTime = 0
      setIsLoading(false)
      onLoading?.(false)
    }
  }, [isParentHovering, onLoading])

  // URL에서 쿼리 파라미터를 제거하고 비디오 확장자 확인
  const cleanUrl = src.split('?')[0];
  const isVideo = cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov') || cleanUrl.includes('video')

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

  return (
    <div
      className="relative cursor-pointer flex items-center justify-center w-full h-full"
    >
      <video
        ref={videoRef}
        src={src}
        className={className}
        muted
        loop
        playsInline
        preload={isPreloaded ? "metadata" : "none"}
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
          // 조용한 에러 처리 - 개발 환경에서만 로그
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