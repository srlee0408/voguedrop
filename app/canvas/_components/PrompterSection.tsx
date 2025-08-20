import { useRef } from "react";
import { ChevronDown } from "lucide-react";

interface PrompterSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  promptText?: string;
  onPromptChange?: (text: string) => void;
}

export function PrompterSection({
  isOpen,
  onToggle,
  promptText = "",
  onPromptChange,
}: PrompterSectionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  return (
    <div className="mb-4">
      <button
        className="flex items-center justify-between w-full text-sm font-medium mb-3 text-foreground hover:text-primary transition-colors"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="prompter-content"
      >
        <h2>Prompter</h2>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      
      {isOpen && (
        <div id="prompter-content" className="bg-surface rounded-lg border border-border p-3">
          <div className="space-y-3">
            {/* Prompt Input */}
            <div className="space-y-2">
              <label htmlFor="prompt-input" className="text-xs font-medium text-foreground">
                Enter your prompt
              </label>
              <textarea
                ref={textareaRef}
                id="prompt-input"
                value={promptText}
                onChange={(e) => onPromptChange?.(e.target.value)}
                placeholder="Describe the motion or effect you want to create..."
                className="textarea-prompter"
                maxLength={500}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Use descriptive words for better results</span>
                <span>{promptText.length}/500</span>
              </div>
            </div>


          </div>
        </div>
      )}
    </div>
  );
}