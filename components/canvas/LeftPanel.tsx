import { ImageSection } from "./ImageSection";
import { EffectsSection, type Effect } from "./EffectsSection";
import { PrompterSection } from "./PrompterSection";
import { QuickActionsBar } from "./QuickActionsBar";

interface LeftPanelProps {
  isPlaying: boolean;
  onPlayToggle: () => void;
  effects: Effect[];
  isPrompterOpen: boolean;
  onPrompterToggle: () => void;
  promptText: string;
  onPromptChange: (text: string) => void;
  onEffectClick: () => void;
  onCameraClick: () => void;
  onModelClick: () => void;
}

export function LeftPanel({
  isPlaying,
  onPlayToggle,
  effects,
  isPrompterOpen,
  onPrompterToggle,
  promptText,
  onPromptChange,
  onEffectClick,
  onCameraClick,
  onModelClick,
}: LeftPanelProps) {
  return (
    <div className="w-64 bg-background p-6 border-r border-border">
      <ImageSection isPlaying={isPlaying} onPlayToggle={onPlayToggle} />
      
      <EffectsSection effects={effects} />
      
      <PrompterSection
        isOpen={isPrompterOpen}
        onToggle={onPrompterToggle}
        promptText={promptText}
        onPromptChange={onPromptChange}
      />
      
      <QuickActionsBar
        onEffectClick={onEffectClick}
        onCameraClick={onCameraClick}
        onModelClick={onModelClick}
      />
    </div>
  );
}