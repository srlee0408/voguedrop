"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Header } from "@/components/layout/Header"
import { LeftPanel } from "./_components/LeftPanel"
import { Canvas } from "./_components/Canvas"
import { LibraryModal } from "@/components/modals/LibraryModal"
import { EffectModal } from "@/components/modals/EffectModal"
import { PromptModal } from "@/components/modals/PromptModal"
import { CameraModal } from "@/components/modals/CameraModal"
import { ModelModal } from "@/components/modals/ModelModal"
import { ProjectTitleModal } from "@/components/modals/ProjectTitleModal"
import { useRouter } from "next/navigation"
import type { GeneratedVideo } from "@/types/canvas"
import type { EffectTemplateWithMedia } from "@/types/database"
import { useBeforeUnload } from "./_hooks/useBeforeUnload"
import { useSlotManager } from "./_hooks/useSlotManager"
import { useVideoGeneration } from "./_hooks/useVideoGeneration"
import { EffectsDataProvider } from "./_hooks/useEffectsData"
import { useAuth } from "@/lib/auth/AuthContext"

// 진행률/애니메이션 유틸은 훅으로 이동

export default function CanvasPage() {
  const router = useRouter()
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isEffectModalOpen, setIsEffectModalOpen] = useState(false)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)
  const [isModelModalOpen, setIsModelModalOpen] = useState(false)
  const [isProjectTitleModalOpen, setIsProjectTitleModalOpen] = useState(false)
  const [isPrompterOpen, setIsPrompterOpen] = useState(false)
  const [promptText, setPromptText] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [selectedResolution] = useState("1:1")
  const [selectedSize] = useState("1024×1024")
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const [currentGeneratingImage, setCurrentGeneratingImage] = useState<string | null>(null)
  const [selectedEffects, setSelectedEffects] = useState<EffectTemplateWithMedia[]>([])
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<string>("6")
  const [isDownloading, setIsDownloading] = useState(false)
  const [favoriteVideos, setFavoriteVideos] = useState<Set<string>>(new Set())
  const { user } = useAuth()

  // 슬롯 상태/배치 훅
  const {
    slotContents,
    slotStates,
    selectedSlotIndex,
    activeVideo,
    handleSlotSelect,
    handleImageUpload,
    removeImageByUrlIfEmpty,
    handleVideoToggle,
    handleRemoveContent: removeSlotContent,
    findAvailableSlotForGeneration,
    setSlotToImage,
    markSlotGenerating,
    placeVideoInSlot,
    resetSlot,
    updateVideoFavoriteFlag,
  } = useSlotManager()

  // 비디오 생성/폴링 훅
  const {
    isGenerating,
    generatingProgress,
    generatingJobIds,
    generationError,
    canGenerate,
    isSlotGenerating,
    generateVideo,
    setGenerationError,
  } = useVideoGeneration({
    getCurrentImage: () => currentGeneratingImage,
    selectedEffects,
    promptText,
    selectedDuration,
    slotManager: {
      slotStates,
      findAvailableSlotForGeneration,
      setSlotToImage,
      markSlotGenerating,
      placeVideoInSlot,
      resetSlot,
    },
    onVideoCompleted: (video) => {
      if (!selectedVideoId) setSelectedVideoId(video.id)
    }
  })
  
  // 페이지 이탈 방지
  useBeforeUnload(isGenerating, 'Video generation is in progress. Leaving the page will cancel the generation.')
  
  // 초기 즐겨찾기 상태 로드
  useEffect(() => {
    async function loadFavorites() {
      if (!user) return
      
      try {
        const response = await fetch('/api/canvas/favorites')
        if (!response.ok) {
          throw new Error('Failed to fetch favorites')
        }
        
        const data = await response.json()
        if (data.favoriteIds) {
          setFavoriteVideos(new Set(data.favoriteIds))
        }
      } catch (error) {
        console.error('Failed to load favorites:', error)
      }
    }
    
    loadFavorites()
  }, [user])
  
  // 훅 내부에서 에러 자동 제거 처리

  const handleEffectSelect = (effect: EffectTemplateWithMedia) => {
    setSelectedEffects(prev => {
      const isSelected = prev.some(e => e.id === effect.id);
      if (isSelected) {
        // Deselect
        return prev.filter(e => e.id !== effect.id);
      } else {
        // Add selection (최대 2개까지만)
        if (prev.length >= 2) {
          // 첫 번째 요소를 제거하고 새로운 것을 추가
          return [...prev.slice(1), effect];
        }
        return [...prev, effect];
      }
    });
  };

  const handleEffectRemove = (effectId: number) => {
    setSelectedEffects(prev => prev.filter(e => e.id !== effectId));
  };

  const handleVideoSelect = (video: GeneratedVideo) => {
    const placed = handleVideoToggle(video, isSlotGenerating)
    if (!placed) {
      setGenerationError('생성 중인 작업이 완료되길 기다려주세요.')
      return
    }
    setSelectedVideoId(video.id)
  }

  // Generate 버튼 활성화 조건은 훅에서 계산

  // 콘텐츠 제거 핸들러
  const handleRemoveContent = (index: number, type: 'image' | 'video') => {
    removeSlotContent(index)
    if (index === 0 && type === 'image') {
      setCurrentGeneratingImage(null)
    }
  }

  const handleGenerateVideo = async () => {
    await generateVideo()
  }

  // 슬롯 선택 핸들러는 useSlotManager 제공 함수를 사용

  // 다운로드 핸들러
  const handleDownload = async () => {
    if (!activeVideo || !activeVideo.url) return;
    
    if (isDownloading) return;
    
    // 파일명 생성: voguedrop_날짜_효과명.mp4
    const date = new Date(activeVideo.createdAt).toISOString().split('T')[0];
    const effectName = selectedEffects[0]?.name.toLowerCase().replace(/\s+/g, '-') || 'video';
    const filename = `voguedrop_${date}_${effectName}.mp4`;
    
    setIsDownloading(true);
    
    try {
      const response = await fetch(activeVideo.url);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Download failed:', error);
      setGenerationError('다운로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 즐겨찾기 토글 핸들러
  const handleToggleFavorite = async (videoId: string) => {
    const isFavorite = favoriteVideos.has(videoId);
    const newFavoriteState = !isFavorite;
    
    // 낙관적 업데이트
    setFavoriteVideos(prev => {
      const newSet = new Set(prev);
      if (newFavoriteState) {
        newSet.add(videoId);
      } else {
        newSet.delete(videoId);
      }
      return newSet;
    });
    updateVideoFavoriteFlag(videoId, newFavoriteState)
    
    try {
      const response = await fetch('/api/canvas/favorite', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: videoId,
          isFavorite: newFavoriteState
        })
      });
      
      if (!response.ok) {
        // 실패시 상태 롤백
        setFavoriteVideos(prev => {
          const newSet = new Set(prev);
          if (isFavorite) {
            newSet.add(videoId);
          } else {
            newSet.delete(videoId);
          }
          return newSet;
        });
        updateVideoFavoriteFlag(videoId, isFavorite)
        
        console.error('Failed to toggle favorite');
      }
    } catch (error) {
      // 에러시 상태 롤백
      setFavoriteVideos(prev => {
        const newSet = new Set(prev);
        if (isFavorite) {
          newSet.add(videoId);
        } else {
          newSet.delete(videoId);
        }
        return newSet;
      });
      updateVideoFavoriteFlag(videoId, isFavorite)
      
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <EffectsDataProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header 
          onLibraryClick={() => setIsLibraryOpen(true)}
          activePage="clip"
          onEditClick={() => setIsProjectTitleModalOpen(true)}
        />

        <div className="flex flex-1">
          <LeftPanel
            isPrompterOpen={isPrompterOpen}
            onPrompterToggle={() => setIsPrompterOpen(!isPrompterOpen)}
            promptText={promptText}
            onPromptChange={setPromptText}
            uploadedImage={currentGeneratingImage}
            onImageUpload={(imageUrl) => {
              setCurrentGeneratingImage(imageUrl)
              handleImageUpload(imageUrl, isSlotGenerating)
            }}
            onImageRemove={() => {
              // LeftPanel의 이미지 제거
              const prevImageUrl = currentGeneratingImage;
              setCurrentGeneratingImage(null);
              if (prevImageUrl) {
                removeImageByUrlIfEmpty(prevImageUrl)
              }
            }}
            generationError={generationError}
            onEffectModalOpen={() => setIsEffectModalOpen(true)}
            selectedEffects={selectedEffects}
            onEffectRemove={handleEffectRemove}
          />

          <Canvas
            selectedResolution={selectedResolution}
            selectedSize={selectedSize}
            onPromptModalOpen={() => setIsPromptModalOpen(true)}
            showControls={true}
            slotContents={slotContents}
            slotStates={slotStates}
            onVideoSelect={handleVideoSelect}
            onGenerateClick={handleGenerateVideo}
            isGenerating={isGenerating}
            canGenerate={canGenerate}
            selectedDuration={selectedDuration}
            onDurationChange={setSelectedDuration}
            generatingProgress={generatingProgress}
            generatingJobIds={generatingJobIds}
            onRemoveContent={handleRemoveContent}
            onSlotSelect={handleSlotSelect}
            selectedSlotIndex={selectedSlotIndex}
            activeVideo={activeVideo}
            onDownloadClick={handleDownload}
            isDownloading={isDownloading}
            favoriteVideos={favoriteVideos}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>

        <LibraryModal 
          isOpen={isLibraryOpen} 
          onClose={() => setIsLibraryOpen(false)} 
          favoriteVideos={favoriteVideos}
          onToggleFavorite={handleToggleFavorite}
        />
        
        <EffectModal 
          isOpen={isEffectModalOpen} 
          onClose={() => setIsEffectModalOpen(false)} 
          onSelectEffect={handleEffectSelect}
          selectedEffects={selectedEffects}
        />
        
        <PromptModal
          isOpen={isPromptModalOpen}
          onClose={() => setIsPromptModalOpen(false)}
          promptText={promptText}
          negativePrompt={negativePrompt}
          onPromptChange={setPromptText}
          onNegativePromptChange={setNegativePrompt}
          onApply={() => {}}
        />
        
        <CameraModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onCapture={() => {}}
        />
        
        <ModelModal
          isOpen={isModelModalOpen}
          onClose={() => setIsModelModalOpen(false)}
          onSelectModel={setSelectedModelId}
          selectedModelId={selectedModelId}
        />

        <ProjectTitleModal
          isOpen={isProjectTitleModalOpen}
          onClose={() => setIsProjectTitleModalOpen(false)}
          onConfirm={(title) => {
            router.push(`/video-editor?title=${encodeURIComponent(title)}`)
          }}
        />
      </div>
    </EffectsDataProvider>
  )
}