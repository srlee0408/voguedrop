import { useEffectsData } from "@/app/canvas/_hooks/useEffectsData";
import { HoverVideo } from "@/shared/components/ui/hover-video";

interface EffectsGalleryProps {
  onEffectClick?: () => void;
}

export function EffectsGallery({ onEffectClick }: EffectsGalleryProps) {
  const { getRepresentativeEffects, isLoading, error } = useEffectsData();
  const representativeEffects = getRepresentativeEffects();

  if (isLoading) {
    return (
      <div className="mb-4">
        <h2 className="text-sm font-medium mb-3 text-foreground">Effect Category</h2>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square rounded-full bg-surface animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4">
        <h2 className="text-sm font-medium mb-3 text-foreground">Effect Category</h2>
        <div className="text-sm text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h2 className="text-sm font-medium mb-3 text-foreground">Effect Category</h2>
      <div className="grid grid-cols-3 gap-2">
        {representativeEffects.map((effect) => (
          <div key={effect.id} className="flex flex-col gap-1">
            <button
              onClick={onEffectClick}
              className="aspect-square rounded-full overflow-hidden relative group hover:ring-2 hover:ring-primary transition-all"
            >
              {effect.previewUrl ? (
                <HoverVideo
                  src={effect.previewUrl}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                  <span className="text-white text-[10px] font-medium px-1 text-center">{effect.name}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-full" />
            </button>
            <p className="text-[10px] text-muted-foreground text-center capitalize">
              {effect.category.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}