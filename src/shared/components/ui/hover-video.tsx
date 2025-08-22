"use client"

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface HoverVideoProps {
  src: string
  className?: string
  fallbackContent?: React.ReactNode
}

export function HoverVideo({
  src,
  className = "",
  fallbackContent
}: HoverVideoProps) {
  const [isHovered, setIsHovered] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && isHovered) {
      videoRef.current.play().catch(() => {
        // Handle autoplay failure silently
      })
    } else if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [isHovered])

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
      className="relative cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <video
        ref={videoRef}
        src={src}
        className={className}
        muted
        loop
        playsInline
        preload="metadata"
      />
      {!src && fallbackContent}
    </div>
  )
}