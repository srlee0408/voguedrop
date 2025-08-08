import { useState } from "react"
import { X } from "lucide-react"

interface ProjectTitleModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (title: string) => void
}

export function ProjectTitleModal({ isOpen, onClose, onConfirm }: ProjectTitleModalProps) {
  const [title, setTitle] = useState("")

  if (!isOpen) return null

  const handleConfirm = () => {
    const finalTitle = title.trim() || "Untitled Project"
    onConfirm(finalTitle)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Enter Project Title</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-text-tertiary hover:text-text-primary rounded-lg hover:bg-surface-secondary transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleConfirm()
            } else if (e.key === 'Escape') {
              onClose()
            }
          }}
          placeholder="Enter project title..."
          className="input-base"
          autoFocus
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-surface-secondary text-text-secondary rounded-button hover:bg-surface-tertiary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-button hover:bg-primary/90 transition-colors"
          >
            Continue to Editor
          </button>
        </div>
      </div>
    </div>
  )
}