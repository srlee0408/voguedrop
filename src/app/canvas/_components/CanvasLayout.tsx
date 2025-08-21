'use client'

import React, { useState } from 'react'
import { Header } from '@/shared/components/layout/Header'
import { LeftPanel } from './LeftPanel'
import { Canvas } from './Canvas'
import { CanvasModals } from './CanvasModals'
import {
  useSlot,
  useSettings,
  useModals,
  useFavorites,
  useEffects,
  useGeneration
} from '../_context/CanvasProviders'
import { useBeforeUnload } from '../_hooks/useBeforeUnload'
import { ProjectSelectorModal } from '@/shared/components/modals/ProjectSelectorModal'
import type { GeneratedVideo } from '@/shared/types/canvas'

/**
 * Canvas 페이지의 메인 레이아웃 컴포넌트
 * Context를 활용하여 모든 상태와 로직을 통합 관리
 */
export function CanvasLayout(): React.ReactElement {
  const [showProjectSelector, setShowProjectSelector] = useState(false)
  
  // 분리된 Context들에서 필요한 상태만 구독
  const { modals } = useModals();
  const { settings } = useSettings();
  const { favorites } = useFavorites();
  const { effects } = useEffects();
  const { slotManager } = useSlot();
  const {
    videoGeneration,
    currentGeneratingImage,
    setCurrentGeneratingImage,
    setCurrentEditingSlotIndex,
    setSelectedVideoId,
    isDownloading,
    handleDownload,
  } = useGeneration();

  // 페이지 이탈 방지
  useBeforeUnload(
    videoGeneration.isGenerating,
    'Video generation is in progress. Leaving the page will cancel the generation.'
  )

  // 이벤트 핸들러들
  const handleVideoSelect = (video: GeneratedVideo): void => {
    const placed = slotManager.handleVideoToggle(video, videoGeneration.isSlotGenerating)
    if (!placed) {
      videoGeneration.setGenerationError('생성 중인 작업이 완료되길 기다려주세요.')
      return
    }
    setSelectedVideoId(video.id)
  }

  const handleRemoveContent = (index: number, type: 'image' | 'video'): void => {
    slotManager.handleRemoveContent(index)
    if (index === 0 && type === 'image') {
      setCurrentGeneratingImage(null)
    }
  }

  const handleImageUpload = (imageUrl: string): void => {
    // 현재 이미지를 먼저 저장하여 슬롯 교체 판단에 사용
    const prevImage = currentGeneratingImage
    setCurrentGeneratingImage(imageUrl)
    slotManager.handleImageUpload(imageUrl, videoGeneration.isSlotGenerating, prevImage)
  }

  const handleImageRemove = (): void => {
    const prevImageUrl = currentGeneratingImage
    setCurrentGeneratingImage(null)
    if (prevImageUrl) {
      slotManager.removeImageByUrlIfEmpty(prevImageUrl)
    }
  }

  const handleToggleFavorite = async (videoId: string): Promise<void> => {
    try {
      await favorites.toggleFavorite(videoId)
      slotManager.updateVideoFavoriteFlag(videoId, favorites.isFavorite(videoId))
    } catch (error) {
      // 에러는 useFavoritesManager에서 처리됨
      console.error('Failed to toggle favorite:', error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header
        onLibraryClick={() => modals.openModal('library')}
        activePage="clip"
        onEditClick={() => setShowProjectSelector(true)}
      />

      <div className="flex flex-1">
        <LeftPanel
          isPrompterOpen={settings.isPrompterOpen}
          onPrompterToggle={() =>
            settings.updateSettings({ isPrompterOpen: !settings.isPrompterOpen })
          }
          promptText={settings.promptText}
          onPromptChange={(text: string) => settings.updateSettings({ promptText: text })}
          uploadedImage={currentGeneratingImage}
          onImageUpload={handleImageUpload}
          onImageRemove={handleImageRemove}
          generationError={videoGeneration.generationError}
          onEffectModalOpen={() => modals.openModal('effect')}
          selectedEffects={effects.selectedEffects}
          onEffectRemove={effects.removeEffect}
        />

        <Canvas
          selectedResolution={settings.selectedResolution}
          selectedSize={settings.selectedSize}
          onPromptModalOpen={() => modals.openModal('prompt')}
          showControls={true}
          slotContents={slotManager.slotContents}
          slotStates={slotManager.slotStates}
          onVideoSelect={handleVideoSelect}
          onGenerateClick={videoGeneration.generateVideo}
          isGenerating={videoGeneration.isGenerating}
          canGenerate={videoGeneration.canGenerate}
          selectedDuration={settings.selectedDuration}
          onDurationChange={(duration: string) =>
            settings.updateSettings({ selectedDuration: duration })
          }
          generatingProgress={videoGeneration.generatingProgress}
          generatingJobIds={videoGeneration.generatingJobIds}
          onRemoveContent={handleRemoveContent}
          onSlotSelect={slotManager.handleSlotSelect}
          selectedSlotIndex={slotManager.selectedSlotIndex}
          activeVideo={slotManager.activeVideo}
          onDownloadClick={handleDownload}
          isDownloading={isDownloading}
          favoriteVideos={favorites.favoriteIds}
          onToggleFavorite={handleToggleFavorite}
          onImageBrushOpen={() => {
            // 현재 이미지가 있는 슬롯 인덱스를 찾아서 저장
            let foundIndex: number | null = null
            
            // 방법 1: selectedSlotIndex 사용 (우선순위)
            if (slotManager.selectedSlotIndex !== null) {
              const selectedSlot = slotManager.slotContents[slotManager.selectedSlotIndex]
              if (selectedSlot?.type === 'image') {
                foundIndex = slotManager.selectedSlotIndex
              }
            }
            
            // 방법 2: currentGeneratingImage와 일치하는 슬롯 찾기
            if (foundIndex === null && currentGeneratingImage) {
              for (let i = 0; i < slotManager.slotContents.length; i++) {
                const slot = slotManager.slotContents[i]
                if (slot?.type === 'image') {
                  foundIndex = i  // 첫 번째 이미지 슬롯 사용
                  break
                }
              }
            }
            
            setCurrentEditingSlotIndex(foundIndex)
            modals.openModal('imageBrush')
          }}
          hasUploadedImage={!!currentGeneratingImage}
        />
      </div>

      <CanvasModals />
      
      {/* Project Selector Modal */}
      <ProjectSelectorModal 
        isOpen={showProjectSelector}
        onClose={() => setShowProjectSelector(false)}
        onNewProject={() => {
          setShowProjectSelector(false);
          modals.openModal('projectTitle');
        }}
      />
    </div>
  )
}