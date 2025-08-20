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

  const isVideo = src.endsWith('.mp4') || src.endsWith('.webm')

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
      className="relative"
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