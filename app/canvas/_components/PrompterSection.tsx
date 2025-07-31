import { useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import type { EffectTemplateWithMedia } from "@/types/database";

interface PrompterSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  promptText?: string;
  onPromptChange?: (text: string) => void;
  selectedEffects?: EffectTemplateWithMedia[];
  onEffectRemove?: (effectId: number) => void;
}

export function PrompterSection({
  isOpen,
  onToggle,
  promptText = "",
  onPromptChange,
  selectedEffects = [],
  onEffectRemove,
}: PrompterSectionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [promptText]);


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
                className="w-full min-h-[80px] p-3 text-sm bg-background border border-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                maxLength={500}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Use descriptive words for better results</span>
                <span>{promptText.length}/500</span>
              </div>
            </div>

            {/* Selected Effects */}
            {selectedEffects.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-foreground">Selected Effects</h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEffects.map((effect) => (
                    <div
                      key={effect.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs"
                    >
                      <span>{effect.name}</span>
                      <button
                        onClick={() => onEffectRemove?.(effect.id)}
                        className="hover:bg-primary/20 rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}