'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, LogOut, User, LogIn } from 'lucide-react'
import { useUserPreferences, type OverlapPreference } from '@/shared/hooks/useUserPreferences'
import { useAuth } from '@/features/user-auth/_context/AuthContext'
import { useRouter } from 'next/navigation'

interface SettingsModalProps {
  isOpen: boolean
  onCloseAction: () => void
}

/**
 * 사용자 설정 모달
 * 
 * 주요 역할:
 * 1. 사용자 인증 상태에 따른 UI 표시
 * 2. 로그인된 사용자: 설정 변경 및 로그아웃
 * 3. 미로그인 사용자: 로그인 버튼 제공
 * 
 * 핵심 특징:
 * - 사용자 인증 상태 확인 및 표시
 * - 설정 변경 시 자동 저장
 * - 로그인/로그아웃 시 자동 리다이렉트
 * 
 * 주의사항:
 * - 외부 클릭 시 모달 닫힘
 * - ESC 키로 모달 닫기 가능
 * - 로그인되지 않은 사용자는 설정 변경 불가
 */
export function SettingsModal({ isOpen, onCloseAction }: SettingsModalProps) {
  // 사용자 인증 정보
  const { user, signOut, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // 사용자 설정 로드/업데이트 훅 사용
  const { profile, is_loading, update_overlap_preference, is_updating } = useUserPreferences()
  const [selected, setSelected] = useState<OverlapPreference>('ask')
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [isOverlapOpen, setIsOverlapOpen] = useState<boolean>(false)

  // 로그인 처리
  const handleSignIn = (): void => {
    const currentPath = window.location.pathname
    const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
    router.push(loginUrl)
    onCloseAction()
  }

  // 로그아웃 처리
  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut()
      onCloseAction()
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  useEffect(() => {
    if (profile?.overlap_replace_preference) {
      setSelected(profile.overlap_replace_preference)
    }
  }, [profile])

  // 외부 클릭 시 닫기 처리
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        onCloseAction()
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseAction()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onCloseAction])

  if (!isOpen) return null

  // 로딩 중일 때 표시
  if (authLoading) {
    return (
      <div
        ref={menuRef}
        className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[9999]"
        role="menu"
        aria-label="User Settings"
      >
        <div className="px-4 py-3 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <span className="text-sm text-gray-400">Loading...</span>
        </div>
      </div>
    )
  }

  return !isOpen ? null : (
    <div
      ref={menuRef}
      className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[9999]"
      role="menu"
      aria-label="User Settings"
    >
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Settings</span>
          {user && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-300 truncate max-w-32">
                {user.email}
              </span>
            </div>
          )}
        </div>
      </div>

      {user ? (
        // 로그인된 사용자용 UI
        <>
          <div className="p-2">
            {/* Overlap behavior list item */}
            <button
              className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-700/50 text-sm text-gray-200"
              onClick={() => setIsOverlapOpen(prev => !prev)}
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">Clip Overlap</span>
                <span className="text-xs text-gray-400">{selected === 'ask' ? 'Ask' : selected === 'always_replace' ? 'Always replace' : 'Never replace'}</span>
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOverlapOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Collapsible content */}
            {isOverlapOpen && (
              <div className="px-3 pb-3">
                {is_loading ? (
                  <div className="text-gray-400 text-sm">Loading...</div>
                ) : (
                  <div className="mt-2">
                    <div className="inline-flex bg-gray-900/60 rounded-md p-1 border border-gray-700">
                      <button
                        className={`px-3 py-1.5 rounded text-xs md:text-sm ${selected === 'ask' ? 'bg-primary text-black' : 'text-gray-300 hover:text-white'}`}
                        onClick={() => setSelected('ask')}
                      >
                        Ask
                      </button>
                      <button
                        className={`px-3 py-1.5 rounded text-xs md:text-sm ${selected === 'always_replace' ? 'bg-primary text-black' : 'text-gray-300 hover:text-white'}`}
                        onClick={() => setSelected('always_replace')}
                      >
                        Always
                      </button>
                      <button
                        className={`px-3 py-1.5 rounded text-xs md:text-sm ${selected === 'never_replace' ? 'bg-primary text-black' : 'text-gray-300 hover:text-white'}`}
                        onClick={() => setSelected('never_replace')}
                      >
                        Never
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">Choose how overlapping clips are handled by default.</div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-700">
            {/* 로그아웃 버튼 */}
            <button
              className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-3 rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30 hover:text-red-300 transition-colors text-sm"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
            
            {/* 기존 버튼들 */}
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-sm"
                onClick={onCloseAction}
              >
                Close
              </button>
              <button
                className="px-3 py-1.5 rounded bg-primary text-black hover:bg-primary/90 disabled:opacity-60 text-sm"
                disabled={is_updating}
                onClick={async () => {
                  await update_overlap_preference(selected)
                  onCloseAction()
                }}
              >
                Save
              </button>
            </div>
          </div>
        </>
      ) : (
        // 로그인되지 않은 사용자용 UI
        <div className="p-4">
          <div className="text-center mb-4">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-200 mb-1">Sign in required</h3>
            <p className="text-sm text-gray-400">
              Sign in to access settings and save your preferences.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-black hover:bg-primary/90 transition-colors text-sm font-medium"
              onClick={handleSignIn}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            
            <button
              className="w-full px-4 py-2 rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors text-sm"
              onClick={onCloseAction}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


