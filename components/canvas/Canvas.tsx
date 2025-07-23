import { Plus, Pin } from "lucide-react";
import { CanvasControls } from "./CanvasControls";
import { useCanvas } from "@/hooks/useCanvas";

interface CanvasProps {
  selectedResolution?: string;
  selectedSize?: string;
  brushSize?: number;
  isBrushPopupOpen?: boolean;
  onPromptModalOpen?: () => void;
  onBrushToggle?: () => void;
  onBrushSizeChange?: (size: number) => void;
  showControls?: boolean;
}

export function Canvas({
  selectedResolution = "16:9",
  selectedSize = "1920×1080",
  brushSize = 50,
  isBrushPopupOpen = false,
  onPromptModalOpen,
  onBrushToggle,
  onBrushSizeChange,
  showControls = false,
}: CanvasProps) {
  const {
    images,
    thumbnails,
    selectedThumbnailIndex,
    toggleFavorite,
    selectThumbnail,
    addNewImage,
  } = useCanvas();

  return (
    <div className="flex-1 p-6 flex bg-background">
      <div className="flex-1 flex flex-col items-center">
        {/* Main Images */}
        <div className="flex gap-4 w-full mb-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="flex-1 h-[640px] bg-surface-secondary rounded-lg overflow-hidden relative"
            >
              <button
                className="absolute top-4 right-4 w-10 h-10 bg-surface/90 backdrop-blur rounded-full flex items-center justify-center z-20 hover:bg-surface transition-colors"
                onClick={() => toggleFavorite(index)}
                aria-label={image.isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Pin
                  className={`w-5 h-5 ${
                    image.isFavorite
                      ? "text-primary fill-current"
                      : "text-foreground/80"
                  }`}
                />
              </button>
              <img
                src={image.url}
                alt={`Canvas image ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Controls */}
        {showControls && onPromptModalOpen && onBrushToggle && onBrushSizeChange && (
          <div className="flex flex-col gap-4">
            <CanvasControls
              selectedResolution={selectedResolution}
              selectedSize={selectedSize}
              brushSize={brushSize}
              isBrushPopupOpen={isBrushPopupOpen}
              onPromptModalOpen={onPromptModalOpen}
              onBrushToggle={onBrushToggle}
              onBrushSizeChange={onBrushSizeChange}
            />
          </div>
        )}
      </div>

      {/* Right Thumbnails */}
      <div className="w-24 flex flex-col items-center space-y-2 ml-4">
        <button
          className="w-20 h-20 bg-surface/10 rounded-md flex items-center justify-center border border-border hover:bg-surface/20 transition-colors"
          onClick={addNewImage}
          aria-label="Add new image"
        >
          <Plus className="w-6 h-6 text-foreground/60" />
        </button>
        {thumbnails.map((thumbnail, index) => (
          <button
            key={thumbnail.id}
            onClick={() => selectThumbnail(index)}
            className={`w-20 h-20 bg-surface/10 rounded-md overflow-hidden transition-all ${
              index === selectedThumbnailIndex
                ? "border-2 border-primary"
                : "border border-transparent hover:border-border"
            }`}
            aria-label={`Select image ${index + 1}`}
          >
            <img
              src={thumbnail.url}
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}