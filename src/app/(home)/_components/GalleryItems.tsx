"use client"

import { Play } from "lucide-react"
import Image from "next/image"
import { getPublicUrl } from "@/infrastructure/supabase/storage"
import type { EffectTemplateWithMedia } from "@/shared/types/database"

interface GalleryItemsProps {
  items: EffectTemplateWithMedia[]
}

export function GalleryItems({ items }: GalleryItemsProps) {
  if (items.length === 0) {
    return (
      <div className="col-span-full text-center py-12">
        <p className="text-gray-400">No gallery items available yet.</p>
      </div>
    )
  }

  return (
    <>
      {items.map((item) => (
        <div
          key={item.id}
          className="group relative aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
          
          {/* Always show gradient as fallback/background */}
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 absolute inset-0" />
          
          {item.preview_media?.storage_path && (
            (() => {
              const url = getPublicUrl(item.preview_media.storage_path)
              const isVideo = url.endsWith('.mp4') || url.endsWith('.webm')
              
              if (isVideo) {
                return (
                  <video
                    src={url}
                    className="w-full h-full object-cover z-[1]"
                    autoPlay
                    loop
                    muted
                    playsInline
                    onError={(e) => {
                      // Hide broken video and show gradient fallback
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )
              } else {
                return (
                  <Image
                    src={url}
                    alt={item.name || "Gallery item"}
                    fill
                    className="object-cover z-[1]"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    onError={(e) => {
                      // Hide broken image and show gradient fallback
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )
              }
            })()
          )}
          
          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 z-20">
            <h3 className="font-semibold text-sm sm:text-base">
              {item.name}
            </h3>
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30">
            <div className="w-12 sm:w-16 h-12 sm:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Play className="w-5 sm:w-6 h-5 sm:h-6 ml-1" />
            </div>
          </div>
        </div>
      ))}
    </>
  )
}