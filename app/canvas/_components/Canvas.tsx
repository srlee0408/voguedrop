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
  onGenerateClick?: () => void;
  isGenerating?: boolean;
  canGenerate?: boolean;
  selectedDuration?: string;
  onDurationChange?: (duration: string) => void;
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
  onGenerateClick,
  isGenerating = false,
  canGenerate = false,
  selectedDuration = "6",
  onDurationChange,
}: CanvasProps) {
  const {
    images,
    toggleFavorite,
  } = useCanvas();

  return (
    <div className="flex-1 flex bg-background">
      <div className="flex-1 flex flex-col">
        {/* Main Images - 4 Columns */}
        <div className="grid grid-cols-4 gap-4 flex-1 p-4">
          {images.map((image, index) => {
            // generatedVideos에서 해당 슬롯의 비디오 찾기
            const video = generatedVideos && generatedVideos[index];
            
            
            
            return (
              <div
                key={image.id}
                className="relative bg-surface rounded-lg overflow-hidden h-full"
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
              
              
              {/* 비디오 또는 이미지 */}
              {video?.url ? (
                <video
                  src={video.url}
                  className="w-full h-full object-cover"
                  controls
                  muted
                  playsInline
                />
              ) : image.url ? (
                <Image
                  src={image.url}
                  alt={`Canvas image ${index + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  fill
                  sizes="(max-width: 1024px) 25vw, 25vw"
                  priority={index === 0}
                />
              ) : null}
            </div>
            );
          })}
        </div>

        {/* Controls */}
        {showControls && onBrushToggle && onBrushSizeChange && (
          <div className="flex justify-center p-4">
            <CanvasControls
              selectedResolution={selectedResolution}
              selectedSize={selectedSize}
              brushSize={brushSize}
              isBrushPopupOpen={isBrushPopupOpen}
              onPromptModalOpen={onPromptModalOpen}
              onBrushToggle={onBrushToggle}
              onBrushSizeChange={onBrushSizeChange}
              onGenerateClick={onGenerateClick}
              isGenerating={isGenerating}
              canGenerate={canGenerate}
              selectedDuration={selectedDuration}
              onDurationChange={onDurationChange}
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