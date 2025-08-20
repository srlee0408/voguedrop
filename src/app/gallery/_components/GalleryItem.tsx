"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import Image from "next/image"
import { getPublicUrl } from "@/shared/lib/supabase"
import type { EffectTemplateWithMedia } from "@/shared/types/database"

interface GalleryItemProps {
  item: EffectTemplateWithMedia
}

export function GalleryItem({ item }: GalleryItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const mediaUrl = item.preview_media?.storage_path 
    ? getPublicUrl(item.preview_media.storage_path)
    : null
    
  const isVideo = mediaUrl && (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm'))

  return (
    <div
      className="group relative aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-[1.02]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
      
      {/* Background fallback */}
      <div className="w-full h-full bg-gradient-to-br from-purple-900/20 to-blue-900/20 absolute inset-0" />
      
      {/* Media content */}
      {mediaUrl && (
        <>
          {isVideo ? (
            <video
              src={mediaUrl}
              className="w-full h-full object-cover z-[1]"
              autoPlay
              loop
              muted
              playsInline
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <Image
              src={mediaUrl}
              alt={item.name || "Gallery item"}
              fill
              className="object-cover z-[1]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          )}
        </>
      )}
      
      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 z-20">
        <h3 className="font-semibold text-lg sm:text-xl line-clamp-1">
          {item.name}
        </h3>
      </div>
      
      {/* Play button on hover */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 z-30 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transform transition-transform hover:scale-110">
          <Play className="w-7 h-7 ml-1 text-white" fill="white" />
        </div>
      </div>
    </div>
  )
}