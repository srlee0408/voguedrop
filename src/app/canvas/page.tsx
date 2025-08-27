'use client'

import React from 'react'
import { CanvasProviders } from './_context/CanvasProviders'
import { CanvasLayout, AuthGuard } from './_components'
import { EffectsDataProvider } from './_hooks/useEffectsData'

/**
 * Canvas 페이지 엔트리 포인트
 * 
 * 주요 역할:
 * 1. 인증된 사용자만 접근 가능하도록 AuthGuard 적용
 * 2. Canvas 관련 Context 제공자들 구성
 * 3. 효과 데이터 제공자로 성능 최적화
 * 
 * 핵심 특징:
 * - AuthGuard로 이중 인증 보안 (middleware + 클라이언트)
 * - 기능별로 분리된 Context로 불필요한 리렌더링 방지
 * - EffectsDataProvider로 효과 데이터 캐싱 및 최적화
 * 
 * 주의사항:
 * - AuthGuard는 클라이언트 컴포넌트이므로 'use client' 필요
 * - middleware.ts에서 1차 보호, AuthGuard에서 2차 보호
 */
export default function CanvasPage(): React.ReactElement {
  return (
    <AuthGuard>
      <EffectsDataProvider>
        <CanvasProviders>
          <CanvasLayout />
        </CanvasProviders>
      </EffectsDataProvider>
    </AuthGuard>
  )
}