import { Pin } from "lucide-react";
import Image from "next/image";
import { CanvasControls } from "./CanvasControls";
import { CanvasHistoryPanel } from "./CanvasHistoryPanel";
import { useCanvas } from "../_hooks/useCanvas";
import type { GeneratedVideo } from "@/types/canvas";

interface CanvasProps {
  selectedResolution?: string;
  selectedSize?: string;
  brushSize?: number;
  isBrushPopupOpen?: boolean;
  onPromptModalOpen?: () => void;
  onBrushToggle?: () => void;
  onBrushSizeChange?: (size: number) => void;
  showControls?: boolean;
  generatedVideos?: GeneratedVideo[];
  selectedVideoId?: number | null;
  onVideoSelect?: (video: GeneratedVideo) => void;
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
  generatedVideos = [],
  selectedVideoId,
  onVideoSelect,
}: CanvasProps) {
  const {
    images,
    toggleFavorite,
  } = useCanvas();

  return (
    <div className="flex-1 p-6 flex bg-background">
      <div className="flex-1 flex flex-col items-center">
        {/* Main Images */}
        <div className="flex gap-4 w-full mb-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="relative flex-1 h-[640px] bg-surface-secondary rounded-lg overflow-hidden"
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
              <Image
                src={image.url}
                alt={`Canvas image ${index + 1}`}
                className="w-full h-full object-cover"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={index === 0}
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

      {/* Right History Panel */}
      <CanvasHistoryPanel
        generatedVideos={generatedVideos}
        selectedVideoId={selectedVideoId}
        onVideoSelect={onVideoSelect}
      />
    </div>
  );
}