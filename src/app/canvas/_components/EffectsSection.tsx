import type { EffectTemplateWithMedia } from "@/shared/types/database";
import { X } from "lucide-react";
import { HoverVideo } from "@/shared/components/ui/hover-video";

export interface Effect {
  id: string;
  name: string;
  image?: string;
  type?: 'motion' | 'style' | 'filter';
}

interface EffectsSectionProps {
  onEffectClick?: () => void;
  selectedEffects?: EffectTemplateWithMedia[];
  onEffectRemove?: (effectId: string) => void;
}

export function EffectsSection({ onEffectClick, selectedEffects, onEffectRemove }: EffectsSectionProps) {

  // Always show 2 slots
  const slots = [0, 1];
  
  return (
    <div className="mb-4">
      <h2 className="text-sm font-medium mb-3 text-foreground">Selected Effects</h2>
      <div className="grid grid-cols-2 gap-1">
        {slots.map((slotIndex) => {
          const effect = selectedEffects?.[slotIndex];
          
          if (effect) {
            return (
              <div
                key={`slot-${slotIndex}`}
                className="bg-surface rounded-md overflow-hidden relative group"
              >
                {effect.previewUrl ? (
                  <div className="relative">
                    <HoverVideo
                      src={effect.previewUrl}
                      className="w-full h-auto"
                      showMode="video-first"
                      pauseMode="pause"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                    <span className="text-white text-xs font-medium px-2 text-center">{effect.name}</span>
                  </div>
                )}
                {/* Effect name overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs font-medium truncate">{effect.name}</p>
                </div>
                {/* Remove button */}
                {onEffectRemove && (
                  <button
                    onClick={() => onEffectRemove(effect.id)}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            );
          }
          
          // Empty slot
          return (
            <button
              key={`slot-${slotIndex}`}
              onClick={onEffectClick}
              className="min-h-[100px] bg-surface rounded-md overflow-hidden relative group hover:ring-1 hover:ring-primary transition-all flex items-center justify-center"
            >
              <div className="text-2xl text-muted-foreground group-hover:text-primary transition-colors">+</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}