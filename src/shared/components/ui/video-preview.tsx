"use client"

import { useState, useRef, useEffect } from 'react'

interface VideoPreviewProps {
  src: string
  fallbackImage?: string
  className?: string
  autoPlayOnHover?: boolean
  muted?: boolean
  loop?: boolean
}

export function VideoPreview({
  src,
  fallbackImage,
  className = "",
  autoPlayOnHover = true,
  muted = true,
  loop = true
}: VideoPreviewProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle video playback
  useEffect(() => {
    if (videoRef.current && showVideo && isHovered && !isMobile) {
      videoRef.current.play().catch(() => {
        // Handle autoplay failure silently
      })
    } else if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [isHovered, showVideo, isMobile])

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (autoPlayOnHover && !isMobile) {
      setShowVideo(true)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  return (
    <div 
      className={`relative cursor-pointer ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Always show video, but control playback based on hover */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        muted={muted}
        loop={loop}
        playsInline
        preload="metadata"
        poster={fallbackImage}
      />
    </div>
  )
}