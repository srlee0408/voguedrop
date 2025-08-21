import { ImageSection } from "./ImageSection";
import { EffectsSection } from "./EffectsSection";
import { PrompterSection } from "./PrompterSection";
import { EffectsGallery } from "./EffectsGallery";
import type { EffectTemplateWithMedia } from "@/shared/types/database";

interface LeftPanelProps {
  isPrompterOpen: boolean;
  onPrompterToggle: () => void;
  promptText: string;
  onPromptChange: (text: string) => void;
  uploadedImage?: string | null;
  onImageUpload?: (imageUrl: string) => void;
  onImageRemove?: () => void;
  generationError?: string | null;
  onEffectModalOpen?: () => void;
  selectedEffects?: EffectTemplateWithMedia[];
  onEffectRemove?: (effectId: string) => void;
}

export function LeftPanel({
  isPrompterOpen,
  onPrompterToggle,
  promptText,
  onPromptChange,
  uploadedImage,
  onImageUpload,
  onImageRemove,
  generationError,
  onEffectModalOpen,
  selectedEffects,
  onEffectRemove,
}: LeftPanelProps) {
  return (
    <div className="w-64 bg-background p-6 border-r border-border">
      <ImageSection 
        uploadedImage={uploadedImage}
        onImageUpload={onImageUpload}
        onImageRemove={onImageRemove}
      />

      <EffectsSection 
        selectedEffects={selectedEffects}
        onEffectClick={onEffectModalOpen}
        onEffectRemove={onEffectRemove}
      />
      
      <PrompterSection
        isOpen={isPrompterOpen}
        onToggle={onPrompterToggle}
        promptText={promptText}
        onPromptChange={onPromptChange}
      />

      <EffectsGallery
        onEffectClick={onEffectModalOpen}
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