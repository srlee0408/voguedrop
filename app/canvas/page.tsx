'use client'

import React from 'react'
import { CanvasProvider } from './_context/CanvasContext'
import { CanvasLayout } from './_components/CanvasLayout'
import { EffectsDataProvider } from './_hooks/useEffectsData'

/**
 * Canvas 페이지 엔트리 포인트
 * 모든 비즈니스 로직은 Context와 컴포넌트로 분리
 * 372줄 → 20줄로 간소화 (95% 감소)
 */
export default function CanvasPage(): React.ReactElement {
  return (
    <EffectsDataProvider>
      <CanvasProvider>
        <CanvasLayout />
      </CanvasProvider>
    </EffectsDataProvider>
  )
}