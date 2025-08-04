import { X, Info, Search, Play, Download, Loader2, Star } from "lucide-react"
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
  const [favoriteStates, setFavoriteStates] = useState<Map<string, boolean>>(new Map())
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
        .order('is_favorite', { ascending: false })
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

  // 즐겨찾기 토글 핸들러
  const handleToggleFavorite = async (video: VideoGeneration) => {
    const currentFavorite = favoriteStates.get(video.job_id || '') ?? video.is_favorite ?? false
    const newFavoriteState = !currentFavorite
    
    // 낙관적 업데이트
    setFavoriteStates(prev => new Map(prev).set(video.job_id || '', newFavoriteState))
    
    try {
      const response = await fetch('/api/canvas/favorite', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.job_id || video.id,
          isFavorite: newFavoriteState
        })
      })
      
      if (!response.ok) {
        // 실패시 상태 롤백
        setFavoriteStates(prev => new Map(prev).set(video.job_id || '', currentFavorite))
        console.error('Failed to toggle favorite')
      } else {
        // 성공시 로컬 상태 업데이트
        setDbVideos(prev => prev.map(v => 
          (v.job_id === video.job_id || v.id === video.id) 
            ? { ...v, is_favorite: newFavoriteState }
            : v
        ))
      }
    } catch (error) {
      // 에러시 상태 롤백
      setFavoriteStates(prev => new Map(prev).set(video.job_id || '', currentFavorite))
      console.error('Error toggling favorite:', error)
    }
  }

  // 다운로드 핸들러
  const handleDownload = (video: VideoGeneration) => {
    if (!video.output_video_url) return
    
    // 파일명 생성: voguedrop_날짜_효과명.mp4
    const date = new Date(video.created_at).toISOString().split('T')[0]
    const effectName = video.selected_effects[0]?.name.toLowerCase().replace(/\s+/g, '-') || 'video'
    const filename = `voguedrop_${date}_${effectName}.mp4`
    
    // 다운로드 트리거
    const a = document.createElement('a')
    a.href = video.output_video_url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }


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
      <div className="bg-white rounded-xl p-6 w-full max-w-[1000px] max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-medium text-black">Library</h3>
          <button className="text-gray-400 hover:text-gray-600" onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Info className="w-4 h-4 text-primary" />
          <p className="text-sm text-gray-500">
            Only favorited videos are permanently stored. Other videos will be automatically deleted after 7 days.
          </p>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <Input
              type="date"
              className="bg-gray-50 text-gray-900 text-sm border-gray-300 focus:border-primary"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-gray-500">to</span>
            <Input
              type="date"
              className="bg-gray-50 text-gray-900 text-sm border-gray-300 focus:border-primary"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search clips..."
              className="bg-gray-50 text-gray-900 text-sm pl-10 pr-4 py-2 w-64 border-gray-300 focus:border-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-4 gap-4 p-1">
          {isLoading ? (
            <div className="col-span-4 flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500">Loading videos...</p>
              </div>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="col-span-4 flex items-center justify-center py-20">
              <p className="text-gray-500">No videos found</p>
            </div>
          ) : (
            filteredVideos.map((video) => (
              <div
                key={video.id}
                className="bg-gray-100 rounded-lg overflow-hidden aspect-square relative"
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
                    <button 
                      onClick={() => handleDownload(video)}
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleToggleFavorite(video)}
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
                    >
                      <Star className={`w-4 h-4 ${
                        favoriteStates.get(video.job_id || '') ?? video.is_favorite
                          ? "fill-current text-yellow-400"
                          : ""
                      }`} />
                    </button>
                  </div>
                  {/* Favorite indicator */}
                  <div className="absolute top-2 right-2">
                    {(favoriteStates.get(video.job_id || '') ?? video.is_favorite) && (
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    )}
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