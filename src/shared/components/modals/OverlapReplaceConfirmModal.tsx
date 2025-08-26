'use client'

import { useState } from 'react'
import { BaseModal } from './BaseModal'

interface OverlapReplaceConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (alwaysReplace: boolean) => void
}

/**
 * 타임라인 겹침 교체 확인 모달
 * - "Always replace from now on" 체크박스 포함
 */
export function OverlapReplaceConfirmModal({ isOpen, onClose, onConfirm }: OverlapReplaceConfirmModalProps) {
  const [always, setAlways] = useState(false)

  if (!isOpen) return null

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Replace overlapping clips?">
      <div className="space-y-6">
        <p className="text-gray-300">The moved clip overlaps with an existing clip. Do you want to replace the overlapped clip?<br/>
        <span className="text-xs text-gray-400">
          This setting will be applied to all future clips. You can change this setting in the settings menu.
        </span>
        </p>

        <label className="flex items-center gap-3 text-gray-300">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-600 bg-gray-800"
            checked={always}
            onChange={(e) => setAlways(e.target.checked)}
          />
          <span>Always replace from now on</span>
        </label>

        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
            onClick={() => onConfirm(always)}
          >
            Replace
          </button>
        </div>
      </div>
    </BaseModal>
  )
}


