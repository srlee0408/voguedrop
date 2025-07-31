import { X, Info, Search, Play, Download, Pin, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useEffect, useState, useCallback } from "react"
import { type VideoGeneration } from "@/lib/db/video-generations"
import { useAuth } from "@/lib/auth/AuthContext"
import { createClient } from "@/lib/supabase/client"

interface LibraryClip {
  title: string
  date: string
  duration: string
  image: string
}

interface LibraryModalProps {
  isOpen: boolean
  onClose: () => void
  clips?: LibraryClip[]
}

export function LibraryModal({ isOpen, onClose }: LibraryModalProps) {
  const [dbVideos, setDbVideos] = useState<VideoGeneration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const { user } = useAuth()

  const fetchVideos = useCallback(async () => {
    try {
      setIsLoading(true)
      if (!user) {
        console.log('No authenticated user')
        setDbVideos([])
        return
      }
      
      const supabase = createClient()
      const { data: videos, error } = await supabase
        .from('video_generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) {
        console.error('Failed to fetch videos:', error)
        return
      }
      
      setDbVideos((videos || []).filter((v: VideoGeneration) => v.status === 'completed' && v.output_video_url))
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isOpen && user) {
      fetchVideos()
    } else if (isOpen && !user) {
      setDbVideos([])
      setIsLoading(false)
    }
  }, [isOpen, user, fetchVideos])


  // Filter videos based on search and date
  const filteredVideos = dbVideos.filter(video => {
    const matchesSearch = !searchTerm || 
      video.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.selected_effects.some(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const videoDate = new Date(video.created_at)
    const matchesStartDate = !startDate || videoDate >= new Date(startDate)
    const matchesEndDate = !endDate || videoDate <= new Date(endDate + 'T23:59:59')
    
    return matchesSearch && matchesStartDate && matchesEndDate
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-[1000px] max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-medium text-white">Library</h3>
          <button className="text-gray-400 hover:text-gray-300" onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Info className="w-4 h-4 text-primary" />
          <p className="text-sm text-gray-400">
            Only favorited videos are permanently stored. Other videos will be automatically deleted after 7 days.
          </p>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <Input
              type="date"
              className="bg-gray-700 text-white text-sm border-gray-600 focus:border-primary"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-gray-400">to</span>
            <Input
              type="date"
              className="bg-gray-700 text-white text-sm border-gray-600 focus:border-primary"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search clips..."
              className="bg-gray-700 text-white text-sm pl-10 pr-4 py-2 w-64 border-gray-600 focus:border-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-4 gap-4 p-1">
          {isLoading ? (
            <div className="col-span-4 flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Loading videos...</p>
              </div>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="col-span-4 flex items-center justify-center py-20">
              <p className="text-gray-400">No videos found</p>
            </div>
          ) : (
            filteredVideos.map((video) => (
              <div
                key={video.id}
                className="bg-gray-700 rounded-lg overflow-hidden aspect-square relative"
              >
                <div className="relative group w-full h-full">
                  {video.input_image_url && (
                    <Image
                      src={video.input_image_url}
                      alt={`Video ${video.id}`}
                      className="object-cover"
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a 
                      href={video.output_video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
                    >
                      <Play className="w-4 h-4" />
                    </a>
                    <a 
                      href={video.output_video_url}
                      download
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white">
                      <Pin className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Model type badge */}
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-black/60 backdrop-blur text-xs text-white rounded">
                      {video.model_type === 'seedance' ? 'Seedance' : 'Hailo'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      </div>
    </div>
  )
}