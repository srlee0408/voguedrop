import { Wand2, Download, Bookmark, Brush, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface CanvasControlsProps {
  selectedResolution: string
  selectedSize: string
  brushSize: number
  isBrushPopupOpen: boolean
  onPromptModalOpen: () => void
  onBrushToggle: () => void
  onBrushSizeChange: (size: number) => void
}

export function CanvasControls({
  selectedResolution,
  selectedSize,
  brushSize,
  isBrushPopupOpen,
  onPromptModalOpen,
  onBrushToggle,
  onBrushSizeChange,
}: CanvasControlsProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-lg border border-gray-700">
      <Button
        className="flex items-center gap-2 px-4 py-2 bg-primary text-black text-sm font-medium rounded-button hover:bg-primary/90 transition-colors"
        onClick={onPromptModalOpen}
      >
        <Wand2 className="w-4 h-4" />
        <span>Generate</span>
      </Button>

      <div className="relative">
        <select className="appearance-none bg-primary text-black text-sm font-medium rounded-button px-4 py-2 pr-8 hover:bg-primary/90 transition-colors cursor-pointer">
          <option value="3">3s</option>
          <option value="5">5s</option>
          <option value="10">10s</option>
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDown className="w-4 h-4 text-black" />
        </div>
      </div>

      <div className="w-px h-6 bg-gray-700"></div>

      <button className="px-3 h-10 flex items-center justify-center text-white/80 hover:text-white rounded-button whitespace-nowrap text-sm">
        {selectedResolution} ({selectedSize})
      </button>

      <button className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white rounded-button">
        <Download className="w-4 h-4" />
      </button>

      <button className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white rounded-button">
        <Bookmark className="w-4 h-4" />
      </button>

      <div className="relative">
        <button
          className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white rounded-button"
          onClick={onBrushToggle}
        >
          <Brush className="w-4 h-4" />
        </button>

        {isBrushPopupOpen && (
          <div
            className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 z-50"
            style={{ width: "140px" }}
          >
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={brushSize} 
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-[10px] text-gray-500 mt-1 text-center">Size: {brushSize}</div>
          </div>
        )}
      </div>
    </div>
  )
}