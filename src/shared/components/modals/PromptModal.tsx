import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { BaseModal } from "./BaseModal"

interface PromptModalProps {
  isOpen: boolean
  onClose: () => void
  promptText: string
  negativePrompt: string
  onPromptChange: (text: string) => void
  onNegativePromptChange: (text: string) => void
  onApply: () => void
}

export function PromptModal({
  isOpen,
  onClose,
  promptText,
  negativePrompt,
  onPromptChange,
  onNegativePromptChange,
  onApply,
}: PromptModalProps) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Prompt">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-black">Prompt</label>
          <Textarea
            className="w-full h-32 p-3 bg-gray-50 text-black text-sm resize-none"
            placeholder="Enter your prompt here..."
            value={promptText}
            onChange={(e) => onPromptChange(e.target.value)}
          />
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Be specific about what you want to create</span>
            <span>{promptText.length}/500</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-black">Negative Prompt</label>
          <Textarea
            className="w-full h-24 p-3 bg-gray-50 text-black text-sm resize-none"
            placeholder="Enter what you don't want to see..."
            value={negativePrompt}
            onChange={(e) => onNegativePromptChange(e.target.value)}
          />
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Describe what you want to exclude</span>
            <span>{negativePrompt.length}/500</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose} className="text-black">
            Cancel
          </Button>
          <Button
            className="bg-primary text-white hover:bg-primary/90"
            onClick={() => {
              onApply()
              onClose()
            }}
          >
            Apply
          </Button>
        </div>
      </div>
    </BaseModal>
  )
}