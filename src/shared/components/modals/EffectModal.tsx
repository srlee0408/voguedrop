import { BaseModal } from "./BaseModal"
import type { EffectTemplateWithMedia } from "@/shared/types/database"
import { useEffectsData } from "@/app/canvas/_hooks/useEffectsData"
import { HoverVideo } from "@/shared/components/ui/hover-video"

interface EffectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectEffect?: (effect: EffectTemplateWithMedia) => void
  selectedEffects?: EffectTemplateWithMedia[]
}

export function EffectModal({ isOpen, onClose, onSelectEffect, selectedEffects = [] }: EffectModalProps) {
  const { getEffectsByCategory, isLoading, error } = useEffectsData()
  
  const effects = getEffectsByCategory("All")

  const handleEffectClick = (effect: EffectTemplateWithMedia) => {
    if (onSelectEffect) {
      onSelectEffect(effect)
    }
  }

  const isEffectSelected = (effectId: number) => {
    return selectedEffects.some(e => e.id === effectId)
  }

  if (!isOpen) return null

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Effect Gallery">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading effects...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 overflow-y-auto max-h-[500px] pr-2">
            {effects.map((effect) => (
              <div 
                key={effect.id} 
                onClick={() => handleEffectClick(effect)}
                className={`aspect-[3/4] rounded-xl overflow-hidden relative group cursor-pointer ${
                  isEffectSelected(effect.id) ? 'ring-2 ring-primary' : ''
                }`}
              >
                {effect.previewUrl ? (
                  <HoverVideo
                    src={effect.previewUrl}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center p-4">
                    <span className="text-gray-700 font-medium text-center">{effect.name}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4 pointer-events-none">
                  <span className="text-white font-medium drop-shadow-lg">{effect.name}</span>
                </div>
                {isEffectSelected(effect.id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center pointer-events-none">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </BaseModal>
  )
}