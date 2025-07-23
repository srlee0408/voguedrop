import { Play, Pause, ChevronDown, X } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

interface Effect {
  name: string
  image: string
}

interface LeftPanelProps {
  isPlaying: boolean
  onPlayToggle: () => void
  effects: Effect[]
  isPrompterOpen: boolean
  onPrompterToggle: () => void
  promptText: string
  onPromptChange: (text: string) => void
  onEffectClick: () => void
  onCameraClick: () => void
  onModelClick: () => void
}

export function LeftPanel({
  isPlaying,
  onPlayToggle,
  effects,
  isPrompterOpen,
  onPrompterToggle,
  promptText,
  onPromptChange,
  onEffectClick,
  onCameraClick,
  onModelClick,
}: LeftPanelProps) {
  return (
    <div className="w-64 bg-black p-6 border-r border-gray-800">
      {/* Image Section */}
      <div className="mb-4">
        <h2 className="text-sm font-medium mb-3 text-white">image</h2>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            className="aspect-square bg-primary rounded-md flex items-center justify-center border border-primary hover:bg-primary/90 transition-colors group"
            onClick={onPlayToggle}
          >
            {isPlaying ? <Pause className="w-4 h-4 text-black" /> : <Play className="w-4 h-4 text-black" />}
          </button>
          <div className="aspect-square bg-gray-100 rounded-md overflow-hidden">
            <img
              src="/placeholder.svg?height=100&width=100"
              alt="Reference 1"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Effects Section */}
      <div className="mt-4">
        <h2 className="text-sm font-medium mb-3 text-white">Effects</h2>
        <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2 mb-4">
          {effects.map((effect, index) => (
            <div
              key={index}
              className="group relative aspect-[3/4] rounded-lg overflow-hidden border border-gray-700 hover:border-primary transition-all duration-300"
            >
              <img
                src={effect.image || "/placeholder.svg"}
                alt={effect.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0">
                <div className="absolute bottom-0 w-full p-3 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-white">{effect.name}</span>
                  <button className="text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Prompter */}
        <div className="mb-4">
          <button
            className="flex items-center gap-2 text-sm font-medium mb-3 text-white hover:text-primary transition-colors"
            onClick={onPrompterToggle}
          >
            <h2>Prompter</h2>
            <ChevronDown className={`w-4 h-4 transition-transform ${isPrompterOpen ? "rotate-180" : ""}`} />
          </button>
          {isPrompterOpen && (
            <div className="bg-black rounded-lg border border-gray-800 shadow-sm">
              <Textarea
                className="w-full h-32 p-4 text-sm resize-none bg-transparent border-none text-white placeholder:text-gray-400"
                placeholder="Full body shot of an Asian male model wearing Supreme streetwear, oversized box logo hoodie, graphic tee underneath, baggy cargo pants, and Supreme cap."
                value={promptText}
                onChange={(e) => onPromptChange(e.target.value)}
              />
              <div className="flex items-center justify-between px-4 py-3 bg-black border-t border-gray-800">
                <div className="text-xs text-gray-400">{promptText.length}/500</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="flex justify-between mt-4 px-2">
        <button className="flex flex-col items-center gap-2" onClick={onEffectClick}>
          <div className="w-12 h-12 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all">
            <img src="/placeholder.svg?height=48&width=48" alt="Effect" className="w-full h-full object-cover" />
          </div>
          <span className="text-xs text-white">Effect</span>
        </button>

        <button className="flex flex-col items-center gap-2" onClick={onCameraClick}>
          <div className="w-12 h-12 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all">
            <img
              src="/placeholder.svg?height=48&width=48"
              alt="Camera Angle"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-xs text-white">Camera Angle</span>
        </button>

        <button className="flex flex-col items-center gap-2" onClick={onModelClick}>
          <div className="w-12 h-12 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all">
            <img src="/placeholder.svg?height=48&width=48" alt="Model" className="w-full h-full object-cover" />
          </div>
          <span className="text-xs text-white">Model</span>
        </button>
      </div>
    </div>
  )
}