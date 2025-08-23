'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { getShortId } from '@/shared/lib/utils'
import { LibraryModal } from '@/shared/components/modals/LibraryModal'
import { EffectModal } from '@/shared/components/modals/EffectModal'
import { PromptModal } from '@/shared/components/modals/PromptModal'
import { CameraModal } from '@/shared/components/modals/CameraModal'
import { ModelModal } from '@/shared/components/modals/ModelModal'
import { ProjectTitleModal } from '@/shared/components/modals/ProjectTitleModal'
import { ImageBrushModal } from './ImageBrushModal'
import {
  useSlot,
  useSettings,
  useModals,
  useEffects,
  useGeneration
} from '../_context/CanvasProviders'

/**
 * Canvas 페이지의 모든 모달을 관리하는 컨테이너 컴포넌트
 * Context를 통해 상태를 가져와 Props drilling 없이 모달 제어
 */
export function CanvasModals(): React.ReactElement {
  const router = useRouter()
  
  // 분리된 Context들에서 필요한 상태만 구독
  const { modals } = useModals();
  const { settings } = useSettings();
  const { effects } = useEffects();
  const { slotManager } = useSlot();
  const { 
    currentGeneratingImage, 
    setCurrentGeneratingImage,
    currentEditingSlotIndex,
    setCurrentEditingSlotIndex 
  } = useGeneration();

  // 프로젝트 전환 핸들러 - UUID를 8자리 단축 ID로 변환
  const handleProjectSwitch = (projectId: string) => {
    const shortId = getShortId(projectId)
    router.push(`/video-editor?project=${encodeURIComponent(shortId)}`)
  }

  return (
    <>
      <LibraryModal
        isOpen={modals.modals.library}
        onClose={() => modals.closeModal('library')}
        onProjectSwitch={handleProjectSwitch}
      />

      <EffectModal
        isOpen={modals.modals.effect}
        onClose={() => modals.closeModal('effect')}
        onSelectEffect={effects.toggleEffect}
        selectedEffects={effects.selectedEffects}
      />

      <PromptModal
        isOpen={modals.modals.prompt}
        onClose={() => modals.closeModal('prompt')}
        promptText={settings.promptText}
        negativePrompt={settings.negativePrompt}
        onPromptChange={(text: string) => settings.updateSettings({ promptText: text })}
        onNegativePromptChange={(text: string) => settings.updateSettings({ negativePrompt: text })}
        onApply={() => {
          // 프롬프트 적용 로직 (필요시 추가)
          modals.closeModal('prompt')
        }}
      />

      <CameraModal
        isOpen={modals.modals.camera}
        onClose={() => modals.closeModal('camera')}
        onCapture={() => {
          // 카메라 캡처 로직 (필요시 추가)
          modals.closeModal('camera')
        }}
      />

      <ModelModal
        isOpen={modals.modals.model}
        onClose={() => modals.closeModal('model')}
        onSelectModel={(modelId: string) => {
          settings.updateSettings({ selectedModelId: modelId })
        }}
        selectedModelId={settings.selectedModelId}
      />

      <ProjectTitleModal
        isOpen={modals.modals.projectTitle}
        onClose={() => modals.closeModal('projectTitle')}
        onConfirm={(projectId: string) => {
          // 생성된 프로젝트의 8자리 단축 ID로 video-editor 페이지로 이동
          router.push(`/video-editor?project=${encodeURIComponent(projectId)}`)
        }}
      />

      {currentGeneratingImage && (
        <ImageBrushModal
          isOpen={modals.modals.imageBrush}
          onClose={() => {
            modals.closeModal('imageBrush')
            setCurrentEditingSlotIndex(null)
          }}
          imageUrl={currentGeneratingImage}
          onComplete={(brushedImageUrl: string) => {
            // 브러시 처리된 이미지로 업데이트
            setCurrentGeneratingImage(brushedImageUrl)
            
            // currentEditingSlotIndex가 있으면 해당 슬롯 업데이트
            if (currentEditingSlotIndex !== null) {
              slotManager.setSlotToImage(currentEditingSlotIndex, brushedImageUrl)
            } else {
              // fallback: 선택된 슬롯 또는 현재 이미지가 있는 슬롯 업데이트
              const selectedIndex = slotManager.selectedSlotIndex
              
              if (selectedIndex !== null) {
                const selectedSlotContent = slotManager.slotContents[selectedIndex]
                if (selectedSlotContent?.type === 'image') {
                  slotManager.setSlotToImage(selectedIndex, brushedImageUrl)
                }
              } else {
                // 현재 이미지와 일치하는 첫 번째 슬롯 찾아서 업데이트
                for (let i = 0; i < slotManager.slotContents.length; i++) {
                  const slot = slotManager.slotContents[i]
                  if (slot?.type === 'image') {
                    slotManager.setSlotToImage(i, brushedImageUrl)
                    break
                  }
                }
              }
            }
            
            modals.closeModal('imageBrush')
            setCurrentEditingSlotIndex(null)
          }}
        />
      )}
    </>
  )
}