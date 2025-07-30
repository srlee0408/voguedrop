import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface PrompterSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  promptText?: string;
  onPromptChange?: (text: string) => void;
  onEffectModalOpen?: () => void;
}

const promptOptions = [
  { id: 'flicks', name: 'Flicks' },
  { id: 'camera-angle', name: 'Camera Angle' },
  { id: 'model', name: 'Model' },
];

export function PrompterSection({
  isOpen,
  onToggle,
  onEffectModalOpen,
}: PrompterSectionProps) {
  const [activeOption, setActiveOption] = useState('flicks');

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
        <div id="prompter-content" className="bg-surface rounded-lg border border-border">
          {/* Options */}
          <div className="flex gap-2 p-3 border-b border-border">
            {promptOptions.map((option) => (
              <button
                key={option.id}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeOption === option.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                onClick={() => {
                  setActiveOption(option.id)
                  if (option.id === 'camera-angle' && onEffectModalOpen) {
                    onEffectModalOpen()
                  }
                }}
              >
                {option.name}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="p-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                <span className="text-xs text-muted-foreground">1</span>
                <span className="text-xs">Gentle breeze effect</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                <span className="text-xs text-muted-foreground">2</span>
                <span className="text-xs">Subtle motion blur</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                <span className="text-xs text-muted-foreground">3</span>
                <span className="text-xs">Dynamic camera movement</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}