import type { 
  FavoritesApiResponse, 
  ToggleFavoriteRequest, 
  ToggleFavoriteResponse 
} from '../_types'
import type { GeneratedVideo } from '@/shared/types/canvas'

/**
 * Canvas 페이지의 모든 API 호출을 담당하는 서비스 레이어
 * 비즈니스 로직과 API 통신을 분리하여 테스트 가능성과 유지보수성 향상
 */
export class CanvasAPI {
  /**
   * 사용자의 즐겨찾기 목록을 가져옴
   */
  static async loadFavorites(): Promise<string[]> {
    const response = await fetch('/api/canvas/favorites', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch favorites: ${response.status} ${response.statusText}`)
    }

    const data: FavoritesApiResponse = await response.json()
    
    if (data.error) {
      throw new Error(data.error)
    }

    return data.favoriteIds || []
  }

  /**
   * 비디오의 즐겨찾기 상태를 토글
   */
  static async toggleFavorite(videoId: string, isFavorite: boolean): Promise<void> {
    const request: ToggleFavoriteRequest = {
      videoId,
      isFavorite,
    }

    const response = await fetch('/api/canvas/favorite', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify(request),
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.error || `Failed to toggle favorite: ${response.status} ${response.statusText}`
      )
    }

    const data: ToggleFavoriteResponse = await response.json()
    
    if (!data.success && data.error) {
      throw new Error(data.error)
    }
  }

  /**
   * 비디오 파일 다운로드
   */
  static async downloadVideo(video: GeneratedVideo): Promise<Blob> {
    if (!video.url) {
      throw new Error('Video URL is not available')
    }

    const response = await fetch(video.url)

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`)
    }

    return await response.blob()
  }

  /**
   * 비디오 다운로드 및 로컬 저장
   */
  static async downloadAndSaveVideo(
    video: GeneratedVideo,
    effectName?: string
  ): Promise<void> {
    const blob = await this.downloadVideo(video)
    
    // 파일명 생성: voguedrop_날짜_효과명.mp4
    const date = new Date(video.createdAt).toISOString().split('T')[0]
    const effect = effectName?.toLowerCase().replace(/\s+/g, '-') || 'video'
    const filename = `voguedrop_${date}_${effect}.mp4`

    // Blob을 다운로드
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.style.display = 'none'
    link.href = url
    link.download = filename
    
    document.body.appendChild(link)
    link.click()
    
    // 정리
    window.URL.revokeObjectURL(url)
    document.body.removeChild(link)
  }

  /**
   * 비디오 생성 작업 상태 확인
   */
  static async checkJobStatus(jobId: string): Promise<{ status: string; progress?: number }> {
    const response = await fetch(`/api/canvas/jobs/${jobId}/poll`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to check job status: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * 생성된 비디오 목록 가져오기
   */
  static async getGeneratedVideos(userId?: string): Promise<GeneratedVideo[]> {
    const params = new URLSearchParams()
    if (userId) {
      params.append('userId', userId)
    }

    const response = await fetch(`/api/canvas/videos?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch videos: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.videos || []
  }
}