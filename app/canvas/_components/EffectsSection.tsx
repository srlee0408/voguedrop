import { useEffect, useState } from "react";
import type { EffectTemplateWithMedia } from "@/types/database";
import { X } from "lucide-react";

export interface Effect {
  id: string;
  name: string;
  image?: string;
  type?: 'motion' | 'style' | 'filter';
}

interface EffectsSectionProps {
  onEffectClick?: () => void;
  selectedEffects?: EffectTemplateWithMedia[];
  onEffectRemove?: (effectId: number) => void;
}

export function EffectsSection({ onEffectClick, selectedEffects, onEffectRemove }: EffectsSectionProps) {
  const [loadedEffects, setLoadedEffects] = useState<EffectTemplateWithMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEffects = async () => {
      try {
        setIsLoading(true);
        
        // Fetch top items from all categories
        const categories = ['effect', 'camera', 'model'];
        const allEffects: EffectTemplateWithMedia[] = [];
        
        for (const category of categories) {
          const response = await fetch(`/api/canvas/effects?category=${category}`);
          
          if (response.ok) {
            const data = await response.json();
            // Get only the first item from each category
            if (data.effects && data.effects.length > 0) {
              allEffects.push(data.effects[0]);
            }
          }
        }
        
        setLoadedEffects(allEffects);
      } catch (err) {
        console.error('Error fetching effects:', err);
        setError('Failed to load effects');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEffects();
  }, []);

  if (isLoading) {
    return (
      <div className="mb-4">
        <h2 className="text-sm font-medium mb-3 text-foreground">Effects</h2>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square bg-surface rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4">
        <h2 className="text-sm font-medium mb-3 text-foreground">Effects</h2>
        <div className="text-sm text-destructive">{error}</div>
      </div>
    );
  }

  // Always show 4 slots
  const slots = [0, 1, 2, 3];
  
  return (
    <div className="mb-4">
      <h2 className="text-sm font-medium mb-3 text-foreground">Selected Effects</h2>
      <div className="grid grid-cols-2 gap-2">
        {slots.map((slotIndex) => {
          const effect = selectedEffects?.[slotIndex];
          
          if (effect) {
            return (
              <div
                key={`slot-${slotIndex}`}
                className="aspect-square bg-surface rounded-md overflow-hidden relative group"
              >
                {effect.previewUrl ? (
                  <img 
                    src={effect.previewUrl} 
                    alt={effect.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
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
              className="aspect-square bg-surface rounded-md overflow-hidden relative group hover:ring-1 hover:ring-primary transition-all flex items-center justify-center"
            >
              <div className="text-2xl text-muted-foreground group-hover:text-primary transition-colors">+</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}