import { X, Info, Play, Download, Loader2, Star, Video, Folder, Upload } from "lucide-react"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth/AuthContext"
import { LibraryVideo, LibraryProject, UserUploadedVideo } from '@/types/video-editor'

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
  favoriteVideos?: Set<string>
  onToggleFavorite?: (videoId: string) => void
}

export function LibraryModal({ isOpen, onClose, favoriteVideos = new Set(), onToggleFavorite }: LibraryModalProps) {
  const [activeCategory, setActiveCategory] = useState<'clips' | 'projects' | 'uploads'>('clips')
  const [clipItems, setClipItems] = useState<LibraryVideo[]>([])
  const [projectItems, setProjectItems] = useState<LibraryProject[]>([])
  const [uploadItems, setUploadItems] = useState<UserUploadedVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [downloadingVideos, setDownloadingVideos] = useState<Set<string>>(new Set())
  const [counts, setCounts] = useState({ clips: 0, projects: 0, uploads: 0 })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const { user } = useAuth()

  const fetchLibraryData = useCallback(async () => {
    try {
      setIsLoading(true)
      if (!user) {
        setClipItems([])
        setProjectItems([])
        setUploadItems([])
        return
      }
      
      const response = await fetch('/api/canvas/library?limit=100')
      
      if (!response.ok) {
        throw new Error('Failed to fetch library data')
      }
      
      const data = await response.json()
      
      // 새로운 응답 형식 처리
      setClipItems(data.clips || data.videos || [])
      setProjectItems(data.projects || [])
      // uploads already have url from API
      setUploadItems(data.uploads || [])
      setCounts(data.counts || { 
        clips: (data.clips || data.videos || []).length, 
        projects: (data.projects || []).length,
        uploads: (data.uploads || []).length
      })
    } catch (error) {
      console.error('Failed to fetch library data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isOpen && user) {
      fetchLibraryData()
    } else if (isOpen && !user) {
      setClipItems([])
      setProjectItems([])
      setUploadItems([])
      setIsLoading(false)
    }
  }, [isOpen, user, fetchLibraryData])

  // 카테고리 변경 핸들러
  const handleCategoryChange = (category: 'clips' | 'projects' | 'uploads') => {
    setActiveCategory(category)
  }
  
  // 파일 업로드 핸들러
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // 파일 크기 체크 (20MB)
    const MAX_SIZE = 20 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      alert(`File size exceeds 20MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
      return
    }
    
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      // Upload progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)
      
      const response = await fetch('/api/upload/video', {
        method: 'POST',
        body: formData,
      })
      
      clearInterval(progressInterval)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }
      
      const data = await response.json()
      setUploadProgress(100)
      
      // Add to upload items
      if (data.video) {
        setUploadItems(prev => [data.video, ...prev])
        setCounts(prev => ({ ...prev, uploads: prev.uploads + 1 }))
      }
      
      // Reset after success
      setTimeout(() => {
        setUploadProgress(0)
        setIsUploading(false)
      }, 500)
      
      // Reset file input
      event.target.value = ''
      
    } catch (err) {
      console.error('Upload error:', err)
      alert(err instanceof Error ? err.message : 'Failed to upload video')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // 즐겨찾기 토글 핸들러
  const handleToggleFavorite = (video: LibraryVideo) => {
    const videoId = video.job_id || String(video.id)
    onToggleFavorite?.(videoId)
  }

  // 다운로드 핸들러 (클립용)
  const handleDownloadClip = async (video: LibraryVideo) => {
    if (!video.output_video_url) return
    
    const videoId = video.job_id || String(video.id)
    
    if (downloadingVideos.has(videoId)) return
    
    const date = new Date(video.created_at).toISOString().split('T')[0]
    const effectName = video.selected_effects[0]?.name.toLowerCase().replace(/\s+/g, '-') || 'video'
    const filename = `voguedrop_${date}_${effectName}.mp4`
    
    setDownloadingVideos(prev => new Set(prev).add(videoId))
    
    try {
      const response = await fetch(video.output_video_url)
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
    } catch (error) {
      console.error('Download failed:', error)
      alert('다운로드에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setDownloadingVideos(prev => {
        const newSet = new Set(prev)
        newSet.delete(videoId)
        return newSet
      })
    }
  }

  // 다운로드 핸들러 (업로드용)
  const handleDownloadUpload = async (upload: UserUploadedVideo & { url?: string }) => {
    const url = upload.url
    if (!url) return
    
    const uploadId = String(upload.id)
    
    if (downloadingVideos.has(uploadId)) return
    
    const date = new Date(upload.uploaded_at).toISOString().split('T')[0]
    const fileName = upload.file_name.toLowerCase().replace(/\s+/g, '-')
    const filename = `voguedrop_upload_${date}_${fileName}`
    
    setDownloadingVideos(prev => new Set(prev).add(uploadId))
    
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      
      window.URL.revokeObjectURL(blobUrl)
      document.body.removeChild(a)
      
    } catch (error) {
      console.error('Download failed:', error)
      alert('다운로드에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setDownloadingVideos(prev => {
        const newSet = new Set(prev)
        newSet.delete(uploadId)
        return newSet
      })
    }
  }

  // 다운로드 핸들러 (프로젝트용)
  const handleDownloadProject = async (project: LibraryProject) => {
    const url = project.latest_video_url
    if (!url) return
    
    const projectId = String(project.id)
    
    if (downloadingVideos.has(projectId)) return
    
    const date = new Date(project.updated_at).toISOString().split('T')[0]
    const projectName = project.project_name.toLowerCase().replace(/\s+/g, '-')
    const filename = `voguedrop_project_${date}_${projectName}.mp4`
    
    setDownloadingVideos(prev => new Set(prev).add(projectId))
    
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      
      window.URL.revokeObjectURL(blobUrl)
      document.body.removeChild(a)
      
    } catch (error) {
      console.error('Download failed:', error)
      alert('다운로드에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setDownloadingVideos(prev => {
        const newSet = new Set(prev)
        newSet.delete(projectId)
        return newSet
      })
    }
  }

  // Filter and sort clips
  const filteredClips = clipItems
    .filter(video => {
      const videoDate = new Date(video.created_at)
      const matchesStartDate = !startDate || videoDate >= new Date(startDate)
      const matchesEndDate = !endDate || videoDate <= new Date(endDate + 'T23:59:59')
      
      return matchesStartDate && matchesEndDate
    })
    .sort((a, b) => {
      const aIsFavorite = favoriteVideos.has(a.job_id || String(a.id)) || a.is_favorite
      const bIsFavorite = favoriteVideos.has(b.job_id || String(b.id)) || b.is_favorite
      
      if (aIsFavorite && !bIsFavorite) return -1
      if (!aIsFavorite && bIsFavorite) return 1
      
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  // Filter and sort projects
  const filteredProjects = projectItems
    .filter(project => {
      const projectDate = new Date(project.updated_at)
      const matchesStartDate = !startDate || projectDate >= new Date(startDate)
      const matchesEndDate = !endDate || projectDate <= new Date(endDate + 'T23:59:59')
      
      return matchesStartDate && matchesEndDate
    })
    .sort((a, b) => {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

  // Filter and sort uploads
  const filteredUploads = uploadItems
    .filter(upload => {
      const uploadDate = new Date(upload.uploaded_at)
      const matchesStartDate = !startDate || uploadDate >= new Date(startDate)
      const matchesEndDate = !endDate || uploadDate <= new Date(endDate + 'T23:59:59')
      
      return matchesStartDate && matchesEndDate
    })
    .sort((a, b) => {
      return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
    })

  if (!isOpen) return null

  const renderClipCard = (video: LibraryVideo) => {
    const videoId = video.job_id || String(video.id)
    const isFavorite = favoriteVideos.has(videoId) || video.is_favorite
    
    return (
      <div
        key={video.id}
        className="bg-gray-700 rounded-lg overflow-hidden aspect-[9/16] relative"
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
              onClick={() => handleDownloadClip(video)}
              disabled={downloadingVideos.has(videoId)}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingVideos.has(videoId) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
          </div>
          {/* Favorite button */}
          <div className="absolute top-2 right-2">
            <button
              onClick={() => handleToggleFavorite(video)}
              className="bg-black/60 p-1.5 rounded-full hover:bg-black/80 transition-colors"
            >
              <Star className={`w-5 h-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${
                isFavorite
                  ? "text-yellow-400 fill-current"
                  : "text-white/70 hover:text-white"
              }`} />
            </button>
          </div>
          {/* Video info overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            {video.selected_effects.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {video.selected_effects.map((effect) => (
                  <span 
                    key={effect.id}
                    className="text-[10px] px-2 py-0.5 bg-black/50 rounded backdrop-blur-sm text-white"
                  >
                    {effect.name}
                  </span>
                ))}
              </div>
            )}
            <div className="text-xs text-gray-300">
              {new Date(video.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderUploadCard = (upload: UserUploadedVideo & { url?: string }) => {
    const uploadId = String(upload.id)
    const hasVideo = !!upload.url
    
    // aspect_ratio에 따른 클래스 결정
    const aspectRatio = upload.aspect_ratio || '16:9';
    const aspectClass = aspectRatio === '9:16' ? 'aspect-[9/16]' : 
                        aspectRatio === '1:1' ? 'aspect-square' : 
                        'aspect-[16/9]';
    
    return (
      <div
        key={upload.id}
        className={`bg-gray-700 rounded-lg overflow-hidden ${aspectClass} relative`}
      >
        <div className="relative group w-full h-full">
          {/* Video Thumbnail - 첫 프레임 사용 */}
          {upload.url ? (
            <video 
              src={upload.url}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
              onError={(e) => {
                // 비디오 로드 실패 시 폴백
                const target = e.target as HTMLVideoElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <i className="ri-upload-cloud-line text-4xl text-gray-600"></i>
            </div>
          )}
          
          {hasVideo && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <a 
                href={upload.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
              >
                <Play className="w-4 h-4" />
              </a>
              <button 
                onClick={() => handleDownloadUpload(upload)}
                disabled={downloadingVideos.has(uploadId)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingVideos.has(uploadId) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
          
          {/* Upload info overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
            <h4 className="text-sm font-medium text-white truncate">
              {upload.file_name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-gray-400">
                {(upload.file_size / (1024 * 1024)).toFixed(2)} MB
              </span>
              {upload.aspect_ratio && (
                <span className="text-[10px] text-gray-400">
                  {upload.aspect_ratio}
                </span>
              )}
              <span className="text-[10px] text-gray-400">
                {new Date(upload.uploaded_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderProjectCard = (project: LibraryProject) => {
    const projectId = String(project.id)
    const hasVideo = !!project.latest_video_url
    
    // aspect_ratio에 따른 클래스 결정
    const aspectRatio = project.content_snapshot?.aspect_ratio || '16:9';
    const aspectClass = aspectRatio === '9:16' ? 'aspect-[9/16]' : 
                        aspectRatio === '1:1' ? 'aspect-square' : 
                        'aspect-[16/9]';
    
    return (
      <div
        key={project.id}
        className={`bg-gray-700 rounded-lg overflow-hidden ${aspectClass} relative`}
      >
        <div className="relative group w-full h-full">
          {/* Video Thumbnail - 첫 프레임 사용 */}
          {project.latest_video_url ? (
            <video 
              src={project.latest_video_url}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
              onError={(e) => {
                // 비디오 로드 실패 시 폴백
                const target = e.target as HTMLVideoElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <Folder className="w-12 h-12 text-gray-600" />
            </div>
          )}
          
          {hasVideo && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <a 
                href={project.latest_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
              >
                <Play className="w-4 h-4" />
              </a>
              <button 
                onClick={() => handleDownloadProject(project)}
                disabled={downloadingVideos.has(projectId)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingVideos.has(projectId) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
          
          {/* Project info overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
            <h4 className="text-sm font-medium text-white truncate">
              {project.project_name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              {project.content_snapshot && (
                <span className="text-[10px] text-gray-400">
                  {project.content_snapshot.aspect_ratio}
                </span>
              )}
              {project.latest_render?.status && (
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  project.latest_render.status === 'completed' 
                    ? 'bg-green-500/20 text-green-400' 
                    : project.latest_render.status === 'processing'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {project.latest_render.status}
                </span>
              )}
              <span className="text-[10px] text-gray-400">
                {new Date(project.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-[1200px] max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 pb-2">
          <h3 className="text-xl font-medium text-white">Library</h3>
          <button className="text-gray-400 hover:text-gray-300" onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 pb-4">
          <Info className="w-4 h-4 text-primary" />
          <p className="text-sm text-gray-400">
            {activeCategory === 'clips' 
              ? "Only favorited videos are permanently stored. Other videos will be automatically deleted after 7 days."
              : activeCategory === 'projects'
              ? "Your saved video projects with render history."
              : "Your uploaded videos (max 20MB per file)."
            }
          </p>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-[200px] bg-gray-900 border-r border-gray-700 p-4">
            <div className="space-y-2">
              <button
                onClick={() => handleCategoryChange('clips')}
                className={`w-full px-4 py-3 rounded-lg text-left transition-colors flex items-center justify-between
                  ${activeCategory === 'clips' 
                    ? 'bg-primary/20 text-primary' 
                    : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5" />
                  <span className="text-sm font-medium">Clips</span>
                </div>
                <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                  {counts.clips}
                </span>
              </button>
              
              <button
                onClick={() => handleCategoryChange('projects')}
                className={`w-full px-4 py-3 rounded-lg text-left transition-colors flex items-center justify-between
                  ${activeCategory === 'projects' 
                    ? 'bg-primary/20 text-primary' 
                    : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5" />
                  <span className="text-sm font-medium">Projects</span>
                </div>
                <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                  {counts.projects}
                </span>
              </button>
              
              <button
                onClick={() => handleCategoryChange('uploads')}
                className={`w-full px-4 py-3 rounded-lg text-left transition-colors flex items-center justify-between
                  ${activeCategory === 'uploads' 
                    ? 'bg-primary/20 text-primary' 
                    : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5" />
                  <span className="text-sm font-medium">Uploads</span>
                </div>
                <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                  {counts.uploads}
                </span>
              </button>
            </div>
            
            {/* Upload Button */}
            {activeCategory === 'uploads' && (
              <div className="mt-4">
                <button
                  onClick={() => document.getElementById('header-video-upload-input')?.click()}
                  disabled={isUploading}
                  className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading... {uploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload Video</span>
                    </>
                  )}
                </button>
                {isUploading && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                <input
                  id="header-video-upload-input"
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Max file size: 20MB
                </p>
              </div>
            )}

            {/* Date Filter */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-xs text-gray-500 mb-3">Filter by date</p>
              <div className="space-y-2">
                <Input
                  type="date"
                  className="bg-gray-800 text-white text-xs border-gray-600 focus:border-primary h-8"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start"
                />
                <span className="text-gray-500 text-xs block text-center">to</span>
                <Input
                  type="date"
                  className="bg-gray-800 text-white text-xs border-gray-600 focus:border-primary h-8"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End"
                />
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Loading library...</p>
                </div>
              </div>
            ) : (
              <>
                {activeCategory === 'clips' ? (
                  filteredClips.length === 0 ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <Video className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">No clips found</p>
                        <p className="text-sm text-gray-500 mt-2">Generate videos in Canvas to see them here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {filteredClips.map(renderClipCard)}
                    </div>
                  )
                ) : activeCategory === 'projects' ? (
                  filteredProjects.length === 0 ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <Folder className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">No projects found</p>
                        <p className="text-sm text-gray-500 mt-2">Save your video projects to see them here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 auto-rows-min">
                      {filteredProjects.map(renderProjectCard)}
                    </div>
                  )
                ) : activeCategory === 'uploads' ? (
                  filteredUploads.length === 0 ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">No uploaded videos found</p>
                        <p className="text-sm text-gray-500 mt-2">Upload your own videos to use them here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-min">
                      {filteredUploads.map(renderUploadCard)}
                    </div>
                  )
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}