import { ImageSection } from "./ImageSection";
import { EffectsSection } from "./EffectsSection";
import { PrompterSection } from "./PrompterSection";
import type { GeneratedVideo } from "@/types/canvas";

interface LeftPanelProps {
  isPrompterOpen: boolean;
  onPrompterToggle: () => void;
  promptText: string;
  onPromptChange: (text: string) => void;
  onImageUpload?: (imageUrl: string) => void;
  generatedVideos?: GeneratedVideo[];
  isGenerating?: boolean;
  generationError?: string | null;
  onEffectModalOpen?: () => void;
}

export function LeftPanel({
  isPrompterOpen,
  onPrompterToggle,
  promptText,
  onPromptChange,
  onImageUpload,
  generatedVideos,
  isGenerating,
  generationError,
  onEffectModalOpen,
}: LeftPanelProps) {
  return (
    <div className="w-64 bg-background p-6 border-r border-border">
      <ImageSection 
        onImageUpload={onImageUpload}
        generatedVideos={generatedVideos}
        isGenerating={isGenerating}
      />

<EffectsSection 
        onEffectClick={onEffectModalOpen}
      />
      
      <PrompterSection
        isOpen={isPrompterOpen}
        onToggle={onPrompterToggle}
        promptText={promptText}
        onPromptChange={onPromptChange}
        onEffectModalOpen={onEffectModalOpen}
      />
    

      {/* Error Message */}
      {generationError && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{generationError}</p>
        </div>
      )}
    </div>
  );
}