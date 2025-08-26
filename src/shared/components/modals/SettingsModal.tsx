'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { useUserPreferences, type OverlapPreference } from '@/shared/hooks/useUserPreferences'

interface SettingsModalProps {
  isOpen: boolean
  onCloseAction: () => void
}

/**
 * 사용자 설정 모달
 * - Overlap 행동 기본값을 설정합니다.
 */
export function SettingsModal({ isOpen, onCloseAction }: SettingsModalProps) {
  // 사용자 설정 로드/업데이트 훅 사용
  const { profile, is_loading, update_overlap_preference, is_updating } = useUserPreferences()
  const [selected, setSelected] = useState<OverlapPreference>('ask')
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [isOverlapOpen, setIsOverlapOpen] = useState<boolean>(false)

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

  return !isOpen ? null : (
    <div
      ref={menuRef}
      className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50"
      role="menu"
      aria-label="User Settings"
    >
      <div className="px-4 py-3 border-b border-gray-700">
        <span className="text-sm text-gray-400">Settings</span>
      </div>
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
      <div className="px-4 py-3 border-t border-gray-700 flex justify-end gap-2">
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
  )
}


