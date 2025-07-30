import { BaseModal } from "./BaseModal"
import { useEffect, useState } from "react"
import type { EffectTemplateWithMedia } from "@/types/database"

interface EffectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectEffect?: (effect: EffectTemplateWithMedia) => void
  selectedEffects?: EffectTemplateWithMedia[]
}

export function EffectModal({ isOpen, onClose, onSelectEffect, selectedEffects = [] }: EffectModalProps) {
  const [effects, setEffects] = useState<EffectTemplateWithMedia[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState("All")

  useEffect(() => {
    if (isOpen) {
      fetchEffects()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedCategory])

  const fetchEffects = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (selectedCategory === "All") {
        // Fetch from all categories
        const categories = ['effect', 'camera', 'model']
        const allEffects: EffectTemplateWithMedia[] = []
        
        for (const category of categories) {
          const response = await fetch(`/api/canvas/effects?category=${category}`)
          
          if (response.ok) {
            const data = await response.json()
            if (data.effects) {
              allEffects.push(...data.effects)
            }
          }
        }
        
        setEffects(allEffects)
      } else {
        // Fetch from specific category
        const categoryMap: { [key: string]: string } = {
          'Effect': 'effect',
          'Camera': 'camera',
          'Model': 'model'
        }
        
        const category = categoryMap[selectedCategory] || 'effect'
        const response = await fetch(`/api/canvas/effects?category=${category}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch effects')
        }
        
        const data = await response.json()
        setEffects(data.effects || [])
      }
    } catch (err) {
      console.error('Error fetching effects:', err)
      setError('Failed to load effects')
    } finally {
      setIsLoading(false)
    }
  }

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
    <BaseModal isOpen={isOpen} onClose={onClose} title="Effect">
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
          <div className="flex gap-2 overflow-x-auto mb-6 pb-2">
            {["All", "Effect", "Camera", "Model"].map((category) => (
              <button
                key={category}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  category === selectedCategory ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-4 overflow-y-auto max-h-[400px] pr-2">
            {effects.map((effect) => (
              <div 
                key={effect.id} 
                onClick={() => handleEffectClick(effect)}
                className={`aspect-[3/4] rounded-xl overflow-hidden relative group cursor-pointer ${
                  isEffectSelected(effect.id) ? 'ring-2 ring-primary' : ''
                }`}
              >
                {effect.previewUrl ? (
                  <img
                    src={effect.previewUrl}
                    alt={effect.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center p-4">
                    <span className="text-gray-700 font-medium text-center">{effect.name}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <span className="text-white font-medium">{effect.name}</span>
                </div>
                {isEffectSelected(effect.id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
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