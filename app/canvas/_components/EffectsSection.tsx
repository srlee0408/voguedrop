import { useEffect, useState } from "react";
import type { EffectTemplateWithMedia } from "@/types/database";

export interface Effect {
  id: string;
  name: string;
  image?: string;
  type?: 'motion' | 'style' | 'filter';
}

interface EffectsSectionProps {
  onEffectClick?: () => void;
}

export function EffectsSection({ onEffectClick }: EffectsSectionProps) {
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

  return (
    <div className="mb-4">
      <h2 className="text-sm font-medium mb-3 text-foreground">Effects</h2>
      <div className="grid grid-cols-2 gap-2">
        {loadedEffects.map((effect) => (
          <button
            key={effect.id}
            onClick={onEffectClick}
            className="aspect-square bg-surface rounded-md overflow-hidden relative group hover:ring-1 hover:ring-primary transition-all"
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
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}