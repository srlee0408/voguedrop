import { X } from "lucide-react";
import Image from "next/image";

export interface Effect {
  name: string;
  image: string;
}

interface EffectsSectionProps {
  effects: Effect[];
  onEffectRemove?: (index: number) => void;
}

export function EffectsSection({ effects, onEffectRemove }: EffectsSectionProps) {
  return (
    <div className="mt-4">
      <h2 className="text-sm font-medium mb-3 text-foreground">Effects</h2>
      <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2 mb-4">
        {effects.map((effect, index) => (
          <div
            key={index}
            className="group relative aspect-[3/4] rounded-lg overflow-hidden border border-border hover:border-primary transition-all duration-300"
          >
            <Image
              src={effect.image || "/placeholder.svg"}
              alt={effect.name}
              className="w-full h-full object-cover"
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/0 to-background/0">
              <div className="absolute bottom-0 w-full p-3 flex items-center justify-between">
                <span className="text-[10px] font-medium text-foreground">
                  {effect.name}
                </span>
                {onEffectRemove && (
                  <button
                    className="text-foreground/60 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onEffectRemove(index)}
                    aria-label={`Remove ${effect.name} effect`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}