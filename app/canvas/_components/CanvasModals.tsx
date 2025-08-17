'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { LibraryModal } from '@/components/modals/LibraryModal'
import { EffectModal } from '@/components/modals/EffectModal'
import { PromptModal } from '@/components/modals/PromptModal'
import { CameraModal } from '@/components/modals/CameraModal'
import { ModelModal } from '@/components/modals/ModelModal'
import { ProjectTitleModal } from '@/components/modals/ProjectTitleModal'
import { useCanvas } from '../_context/CanvasContext'

/**
 * Canvas 페이지의 모든 모달을 관리하는 컨테이너 컴포넌트
 * Context를 통해 상태를 가져와 Props drilling 없이 모달 제어
 */
export function CanvasModals(): React.ReactElement {
  const router = useRouter()
  const { modals, settings, favorites, effects } = useCanvas()

  return (
    <>
      <LibraryModal
        isOpen={modals.modals.library}
        onClose={() => modals.closeModal('library')}
        favoriteVideos={favorites.favoriteIds}
        onToggleFavorite={favorites.toggleFavorite}
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
        onConfirm={(title: string) => {
          router.push(`/video-editor?title=${encodeURIComponent(title)}`)
        }}
      />
    </>
  )
}