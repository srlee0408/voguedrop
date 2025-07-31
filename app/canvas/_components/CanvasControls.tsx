import { Wand2, Download, Bookmark, Brush, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CanvasControlsProps {
  selectedResolution: string
  selectedSize: string
  brushSize: number
  isBrushPopupOpen: boolean
  onPromptModalOpen?: () => void
  onBrushToggle: () => void
  onBrushSizeChange: (size: number) => void
  onGenerateClick?: () => void
  isGenerating?: boolean
  canGenerate?: boolean
  selectedDuration?: string
  onDurationChange?: (duration: string) => void
}

export function CanvasControls({
  selectedResolution,
  selectedSize,
  brushSize,
  isBrushPopupOpen,
  onPromptModalOpen,
  onBrushToggle,
  onBrushSizeChange,
  onGenerateClick,
  isGenerating = false,
  canGenerate = false,
  selectedDuration = "6",
  onDurationChange,
}: CanvasControlsProps) {
  return (
    <div className="flex items-center gap-2 bg-surface-secondary p-2 rounded-lg border border-border">
      <Button
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-button hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors"
        onClick={onGenerateClick || onPromptModalOpen}
        disabled={!canGenerate || isGenerating}
      >
        <Wand2 className="w-4 h-4" />
        <span>{isGenerating ? 'Generating...' : 'Generate'}</span>
      </Button>

      <div className="relative">
        <select 
          className="appearance-none bg-primary text-primary-foreground text-sm font-medium rounded-button px-4 py-2 pr-8 hover:bg-primary/90 transition-colors cursor-pointer"
          value={selectedDuration}
          onChange={(e) => onDurationChange?.(e.target.value)}
        >
          <option value="6">6s</option>
          <option value="10">10s</option>
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDown className="w-4 h-4 text-primary-foreground" />
        </div>
      </div>

      <div className="w-px h-6 bg-border"></div>

      <button className="px-3 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-button whitespace-nowrap text-sm">
        {selectedResolution} ({selectedSize})
      </button>

      <button className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-button">
        <Download className="w-4 h-4" />
      </button>

      <button className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-button">
        <Bookmark className="w-4 h-4" />
      </button>

      <div className="relative">
        <button
          className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-button"
          onClick={onBrushToggle}
        >
          <Brush className="w-4 h-4" />
        </button>

        {isBrushPopupOpen && (
          <div
            className="absolute -top-16 left-1/2 -translate-x-1/2 bg-surface rounded-lg shadow-lg p-2 z-50"
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
            <div className="text-[10px] text-text-tertiary mt-1 text-center">Size: {brushSize}</div>
          </div>
        )}
      </div>
    </div>
  )
}