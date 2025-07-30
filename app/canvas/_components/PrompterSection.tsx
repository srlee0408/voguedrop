import { ChevronDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface PrompterSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  promptText: string;
  onPromptChange: (text: string) => void;
  maxLength?: number;
}

export function PrompterSection({
  isOpen,
  onToggle,
  promptText,
  onPromptChange,
  maxLength = 500,
}: PrompterSectionProps) {
  return (
    <div className="mb-4">
      <button
        className="flex items-center gap-2 text-sm font-medium mb-3 text-foreground hover:text-primary transition-colors"
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
        <div id="prompter-content" className="bg-surface rounded-lg border border-border shadow-sm">
          <Textarea
            className="w-full h-32 p-4 text-sm resize-none bg-transparent border-none text-foreground placeholder:text-muted-foreground"
            placeholder="Full body shot of an Asian male model wearing Supreme streetwear, oversized box logo hoodie, graphic tee underneath, baggy cargo pants, and Supreme cap."
            value={promptText}
            onChange={(e) => onPromptChange(e.target.value)}
            maxLength={maxLength}
            aria-label="Prompt text"
          />
          <div className="flex items-center justify-between px-4 py-3 bg-surface border-t border-border">
            <div className="text-xs text-muted-foreground">
              {promptText.length}/{maxLength}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}