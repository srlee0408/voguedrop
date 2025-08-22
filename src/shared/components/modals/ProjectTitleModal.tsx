import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import { createNewProject } from "@/lib/api/projects"
import { getShortId } from "@/shared/lib/utils"
import { toast } from "sonner"

interface ProjectTitleModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (projectId: string, title: string) => void
}

export function ProjectTitleModal({ isOpen, onClose, onConfirm }: ProjectTitleModalProps) {
  const [title, setTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (isCreating) return
    
    const finalTitle = title.trim() || "Untitled Project"
    setIsCreating(true)
    
    try {
      // 새 프로젝트 생성 API 호출
      const result = await createNewProject(finalTitle)
      
      if (result.success && result.projectId) {
        // UUID를 8자리 단축 ID로 변환
        const shortId = getShortId(result.projectId)
        onConfirm(shortId, finalTitle)
        onClose()
        setTitle("") // 모달 닫을 때 제목 초기화
      } else {
        toast.error(result.error || 'Failed to create project')
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Failed to create project')
    } finally {
      setIsCreating(false)
    }
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
            if (e.key === 'Enter' && !isCreating) {
              handleConfirm()
            } else if (e.key === 'Escape') {
              onClose()
            }
          }}
          placeholder="Enter project title..."
          className="input-base"
          autoFocus
          disabled={isCreating}
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="flex-1 px-4 py-2 bg-surface-secondary text-text-secondary rounded-button hover:bg-surface-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isCreating}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-button hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Continue to Editor'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}