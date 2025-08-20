'use client'

import { useState, useCallback } from 'react'
import type { CanvasSettings, CanvasSettingsReturn } from '../_types'

const defaultSettings: CanvasSettings = {
  promptText: '',
  negativePrompt: '',
  selectedResolution: '1:1',
  selectedSize: '1024×1024',
  selectedModelId: '',
  selectedDuration: '6',
  isPrompterOpen: false,
}

/**
 * Canvas 페이지의 모든 설정을 관리하는 훅
 * 프롬프트, 해상도, 모델 등의 설정 통합 관리
 * localStorage 복원 지원
 */
export function useCanvasSettings(initialSettings?: Partial<CanvasSettings>): CanvasSettingsReturn {
  const [settings, setSettings] = useState<CanvasSettings>({
    ...defaultSettings,
    ...initialSettings,
  })

  const updateSettings = useCallback((newSettings: Partial<CanvasSettings>): void => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
    }))
  }, [])

  const resetSettings = useCallback((): void => {
    setSettings(defaultSettings)
  }, [])

  return {
    ...settings,
    updateSettings,
    resetSettings,
  }
}