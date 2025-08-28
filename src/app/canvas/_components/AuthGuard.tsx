'use client'

import React from 'react'
import { useAuth } from '@/features/user-auth/_context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * AuthGuard - 인증된 사용자만 접근 가능한 컴포넌트
 * 
 * 주요 역할:
 * 1. 사용자 인증 상태 확인
 * 2. 미인증 사용자를 로그인 페이지로 리다이렉트
 * 3. 로딩 상태 처리
 * 
 * 핵심 특징:
 * - useAuth 훅을 통한 실시간 인증 상태 감지
 * - 자동 리다이렉트로 사용자 경험 개선
 * - 로딩 스피너로 상태 전환 시 깜빡임 방지
 * 
 * 주의사항:
 * - 클라이언트 컴포넌트로만 동작 (useAuth 훅 사용)
 * - middleware.ts와 함께 이중 보안 제공
 */
interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps): React.ReactElement {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 로딩이 완료되고 사용자가 없으면 로그인 페이지로 리다이렉트
    if (!loading && !user) {
      const currentPath = window.location.pathname
      const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
      router.push(loginUrl)
    }
  }, [user, loading, router])

  // 로딩 중이거나 사용자가 없으면 fallback 또는 로딩 화면 표시
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-white text-lg mb-4">Login required.</p>
          <p className="text-gray-400">Redirecting to login page...</p>
        </div>
      </div>
    )
  }

  // 인증된 사용자만 children 렌더링
  return <>{children}</>
}
