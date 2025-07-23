import { Plus, Pin } from "lucide-react"
import { CanvasControls } from "./CanvasControls"

interface CanvasAreaProps {
  favorites: boolean[]
  onToggleFavorite: (index: number) => void
  selectedResolution: string
  selectedSize: string
  brushSize: number
  isBrushPopupOpen: boolean
  onPromptModalOpen: () => void
  onBrushToggle: () => void
  onBrushSizeChange: (size: number) => void
}

export function CanvasArea({
  favorites,
  onToggleFavorite,
  selectedResolution,
  selectedSize,
  brushSize,
  isBrushPopupOpen,
  onPromptModalOpen,
  onBrushToggle,
  onBrushSizeChange,
}: CanvasAreaProps) {
  return (
    <div className="flex-1 p-6 flex bg-black">
      <div className="flex-1 flex flex-col items-center">
        {/* Main Images */}
        <div className="flex gap-4 w-full mb-4">
          {[1, 2, 3].map((index) => (
            <div key={index} className="flex-1 h-[640px] bg-gray-800 rounded-md overflow-hidden relative">
              <button
                className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center z-20 hover:bg-white transition-colors"
                onClick={() => onToggleFavorite(index - 1)}
              >
                <Pin
                  className={`w-5 h-5 ${favorites[index - 1] ? "text-green-500 fill-current" : "text-black/80"}`}
                />
              </button>
              <img
                src={`/placeholder.svg?height=640&width=405&query=fashion lookbook photo ${index}`}
                alt={`Lookbook ${index}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4">
          <CanvasControls
            selectedResolution={selectedResolution}
            selectedSize={selectedSize}
            brushSize={brushSize}
            isBrushPopupOpen={isBrushPopupOpen}
            onPromptModalOpen={onPromptModalOpen}
            onBrushToggle={onBrushToggle}
            onBrushSizeChange={onBrushSizeChange}
          />
        </div>
      </div>

      {/* Right Thumbnails */}
      <div className="w-24 flex flex-col items-center space-y-2 ml-4">
        <button className="w-20 h-20 bg-black/10 rounded-md flex items-center justify-center border border-black/20">
          <Plus className="w-6 h-6 text-white/60" />
        </button>
        {[1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`w-20 h-20 bg-black/10 rounded-md overflow-hidden ${index === 2 ? "border-2 border-green-500" : ""}`}
          >
            <img
              src={`/placeholder.svg?height=80&width=80&query=generated fashion image ${index}`}
              alt={`Generated Image ${index}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  )
}