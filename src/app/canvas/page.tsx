'use client'

import React from 'react'
import { CanvasProviders } from './_context/CanvasProviders'
import { CanvasLayout } from './_components/CanvasLayout'
import { EffectsDataProvider } from './_hooks/useEffectsData'

/**
 * Canvas 페이지 엔트리 포인트
 * 리팩토링된 Context 구조를 사용하여 성능 최적화
 * - 기존 CanvasProvider → CanvasProviders로 변경
 * - 기능별로 분리된 Context로 불필요한 리렌더링 방지
 */
export default function CanvasPage(): React.ReactElement {
  return (
    <EffectsDataProvider>
      <CanvasProviders>
        <CanvasLayout />
      </CanvasProviders>
    </EffectsDataProvider>
  )
}