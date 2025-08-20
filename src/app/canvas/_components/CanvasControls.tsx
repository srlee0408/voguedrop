import { Wand2, Download, ChevronDown, Loader2, Brush } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { GeneratedVideo } from "@/types/canvas"

interface CanvasControlsProps {
  selectedResolution: string
  selectedSize: string
  onPromptModalOpen?: () => void
  onGenerateClick?: () => void
  canGenerate?: boolean
  selectedDuration?: string
  onDurationChange?: (duration: string) => void
  onDownloadClick?: () => void
  activeVideo?: GeneratedVideo | null
  isDownloading?: boolean
  onImageBrushOpen?: () => void
  hasUploadedImage?: boolean
}

export function CanvasControls({
  onPromptModalOpen,
  onGenerateClick,
  canGenerate = false,
  selectedDuration = "6",
  onDurationChange,
  onDownloadClick,
  activeVideo,
  isDownloading = false,
  onImageBrushOpen,
  hasUploadedImage = false,
}: CanvasControlsProps) {
  return (
    <div className="flex items-center gap-2 bg-surface-secondary p-2 rounded-lg border border-border">
      <Button
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-button hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors"
        onClick={onGenerateClick || onPromptModalOpen}
        disabled={!canGenerate}
      >
        <Wand2 className="w-4 h-4" />
        <span>Generate</span>
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

      <Button
        className="flex items-center gap-2 px-3 h-10 bg-surface-secondary hover:bg-surface-tertiary text-text-secondary hover:text-text-primary rounded-button text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onImageBrushOpen}
        disabled={!hasUploadedImage}
        variant="ghost"
        title={!hasUploadedImage ? "Upload an image first" : "Edit image with AI brush"}
      >
        <Brush className="w-4 h-4" />
        <span>Image Brush</span>
      </Button>

      <button 
        className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-button disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onDownloadClick}
        disabled={!activeVideo || isDownloading}
        title={!activeVideo ? "Select a video to download" : "Download video"}
      >
        {isDownloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}