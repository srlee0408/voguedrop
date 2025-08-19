'use client'

import { useState, useCallback } from 'react'
import type { ModalName, ModalState, ModalManagerReturn } from '../_types'

const initialModalState: ModalState = {
  library: false,
  effect: false,
  prompt: false,
  camera: false,
  model: false,
  projectTitle: false,
  imageBrush: false,
}

/**
 * Canvas 페이지의 모든 모달 상태를 통합 관리하는 훅
 * 6개의 개별 useState를 하나로 통합하여 Props drilling 해결
 */
export function useModalManager(): ModalManagerReturn {
  const [modals, setModals] = useState<ModalState>(initialModalState)

  const toggleModal = useCallback((modalName: ModalName): void => {
    setModals((prev) => ({
      ...prev,
      [modalName]: !prev[modalName],
    }))
  }, [])

  const openModal = useCallback((modalName: ModalName): void => {
    setModals((prev) => ({
      ...prev,
      [modalName]: true,
    }))
  }, [])

  const closeModal = useCallback((modalName: ModalName): void => {
    setModals((prev) => ({
      ...prev,
      [modalName]: false,
    }))
  }, [])

  const closeAllModals = useCallback((): void => {
    setModals(initialModalState)
  }, [])

  return {
    modals,
    toggleModal,
    openModal,
    closeModal,
    closeAllModals,
  }
}