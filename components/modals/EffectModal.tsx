import { BaseModal } from "./BaseModal"
import Image from "next/image"

interface Effect {
  name: string
  image: string
}

interface EffectModalProps {
  isOpen: boolean
  onClose: () => void
  effects: Effect[]
}

export function EffectModal({ isOpen, onClose, effects }: EffectModalProps) {
  const categories = ["All", "Glitch", "Wave", "Distortion", "Liquid"]

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Effect">
      <div className="flex gap-2 overflow-x-auto mb-6 pb-2">
        {categories.map((category) => (
          <button
            key={category}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
              category === "All" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4 overflow-y-auto max-h-[400px] pr-2">
        {effects.map((effect, index) => (
          <div key={index} className="aspect-[3/4] rounded-xl overflow-hidden relative group cursor-pointer">
            <Image
              src={effect.image || "https://readdy.ai/api/search-image?query=Abstract visual effect for fashion editing&width=300&height=400&seq=99&orientation=portrait"}
              alt={effect.name}
              className="w-full h-full object-cover"
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
              <span className="text-white font-medium">{effect.name}</span>
            </div>
          </div>
        ))}
      </div>
    </BaseModal>
  )
}