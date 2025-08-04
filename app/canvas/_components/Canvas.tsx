import { Pin, X } from "lucide-react";
import Image from "next/image";
import { CanvasControls } from "./CanvasControls";
import { CanvasHistoryPanel } from "./CanvasHistoryPanel";
import { VideoGenerationProgress } from "./VideoGenerationProgress";
import { useCanvas } from "../_hooks/useCanvas";
import type { GeneratedVideo } from "@/types/canvas";
import { useState } from "react";

interface CanvasProps {
  selectedResolution?: string;
  selectedSize?: string;
  onPromptModalOpen?: () => void;
  showControls?: boolean;
  generatedVideos?: GeneratedVideo[];
  onVideoSelect?: (video: GeneratedVideo) => void;
  onGenerateClick?: () => void;
  isGenerating?: boolean;
  canGenerate?: boolean;
  selectedDuration?: string;
  onDurationChange?: (duration: string) => void;
  generatingProgress?: Map<string, number>;
  webhookStatus?: string;
  elapsedMinutes?: number;
  elapsedSeconds?: number;
  selectedHistoryVideos?: GeneratedVideo[];
  uploadedImage?: string | null;
  onRemoveContent?: (index: number, type: 'image' | 'video') => void;
  onSlotSelect?: (index: number, video: GeneratedVideo | null) => void;
  selectedSlotIndex?: number | null;
  activeVideo?: GeneratedVideo | null;
  onDownloadClick?: () => void;
  isDownloading?: boolean;
}

export function Canvas({
  selectedResolution = "16:9",
  selectedSize = "1920×1080",
  onPromptModalOpen,
  showControls = false,
  generatedVideos = [],
  onVideoSelect,
  onGenerateClick,
  isGenerating = false,
  canGenerate = false,
  selectedDuration = "6",
  onDurationChange,
  generatingProgress = new Map(),
  webhookStatus = "",
  elapsedMinutes = 0,
  elapsedSeconds = 0,
  selectedHistoryVideos = [],
  uploadedImage = null,
  onRemoveContent,
  onSlotSelect,
  selectedSlotIndex,
  activeVideo,
  onDownloadClick,
  isDownloading = false,
}: CanvasProps) {
  const {
    images,
  } = useCanvas();
  
  // 즐겨찾기 상태를 추적하기 위한 로컬 상태
  const [favoriteStates, setFavoriteStates] = useState<Map<string, boolean>>(new Map());
  
  // 즐겨찾기 토글 핸들러
  const handleToggleFavorite = async (index: number, video: GeneratedVideo) => {
    const currentFavorite = favoriteStates.get(video.id) ?? video.isFavorite ?? false;
    const newFavoriteState = !currentFavorite;
    
    // 낙관적 업데이트
    setFavoriteStates(prev => new Map(prev).set(video.id, newFavoriteState));
    
    try {
      const response = await fetch('/api/canvas/favorite', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          isFavorite: newFavoriteState
        })
      });
      
      if (!response.ok) {
        // 실패시 상태 롤백
        setFavoriteStates(prev => new Map(prev).set(video.id, currentFavorite));
        console.error('Failed to toggle favorite');
      }
    } catch (error) {
      // 에러시 상태 롤백
      setFavoriteStates(prev => new Map(prev).set(video.id, currentFavorite));
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <div className="flex-1 flex bg-background">
      <div className="flex-1 flex flex-col">
        {/* Main Images - 4 Columns */}
        <div className="grid grid-cols-4 gap-4 flex-1 p-4">
          {images.map((image, index) => {
            // 표시할 콘텐츠 결정 로직
            let displayContent: { type: 'video' | 'image' | 'empty', data?: GeneratedVideo | string } = { type: 'empty' };
            
            // 1. 업로드된 이미지가 있고 첫 번째 슬롯인 경우
            if (uploadedImage && index === 0) {
              displayContent = { type: 'image', data: uploadedImage };
            }
            // 2. 생성된 비디오가 있는 경우 (왼쪽부터)
            else if (generatedVideos && generatedVideos[index]) {
              displayContent = { type: 'video', data: generatedVideos[index] };
            }
            // 3. 선택된 히스토리 비디오가 있는 경우 - 왼쪽부터 채우기
            else if (selectedHistoryVideos.length > 0) {
              // 왼쪽부터 채우기
              const videoIndex = uploadedImage ? index - 1 : index;
              if (videoIndex >= 0 && videoIndex < selectedHistoryVideos.length) {
                displayContent = { type: 'video', data: selectedHistoryVideos[videoIndex] };
              }
            }
            // 4. 기본 이미지가 있는 경우
            else if (image.url) {
              displayContent = { type: 'image', data: image.url };
            }
            
            // 현재 슬롯의 생성 진행률 찾기
            const progress = generatingProgress.get(index.toString()) || 0;
            const isGeneratingThisSlot = isGenerating && generatingProgress.has(index.toString()) && progress < 100;
            
            return (
              <div
                key={image.id}
                className={`relative bg-surface rounded-lg overflow-hidden h-full cursor-pointer transition-all ${
                  selectedSlotIndex === index ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => {
                  if (displayContent.type === 'video' && displayContent.data) {
                    onSlotSelect?.(index, displayContent.data as GeneratedVideo);
                  } else {
                    onSlotSelect?.(index, null);
                  }
                }}
              >
              {/* Pin button - 비디오가 있는 슬롯에만 표시 */}
              {displayContent.type === 'video' && displayContent.data && (
                <button
                  className="absolute top-4 right-4 w-10 h-10 bg-surface/90 backdrop-blur rounded-full flex items-center justify-center z-20 hover:bg-surface transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(index, displayContent.data as GeneratedVideo);
                  }}
                  aria-label={
                    favoriteStates.get((displayContent.data as GeneratedVideo).id) ?? 
                    (displayContent.data as GeneratedVideo).isFavorite 
                      ? "Remove from favorites" 
                      : "Add to favorites"
                  }
                >
                  <Pin
                    className={`w-5 h-5 ${
                      favoriteStates.get((displayContent.data as GeneratedVideo).id) ?? 
                      (displayContent.data as GeneratedVideo).isFavorite
                        ? "text-primary fill-current"
                        : "text-foreground/80"
                    }`}
                  />
                </button>
              )}
              
              {/* X button for removing content */}
              {displayContent.type !== 'empty' && onRemoveContent && (
                <button
                  className="absolute top-4 right-16 w-10 h-10 bg-black/60 backdrop-blur rounded-full flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (displayContent.type === 'video' && displayContent.data) {
                      onRemoveContent(index, 'video');
                    } else if (displayContent.type === 'image' && displayContent.data) {
                      onRemoveContent(index, 'image');
                    }
                  }}
                  aria-label="Remove content"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              )}
              
              
              {/* 비디오 또는 이미지 표시 */}
              {displayContent.type === 'video' && displayContent.data ? (
                <video
                  src={(displayContent.data as GeneratedVideo).url}
                  className="w-full h-full object-cover"
                  controls
                  muted
                  playsInline
                />
              ) : displayContent.type === 'image' && displayContent.data ? (
                <Image
                  src={displayContent.data as string}
                  alt={`Canvas image ${index + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  fill
                  sizes="(max-width: 1024px) 25vw, 25vw"
                  priority={index === 0}
                />
              ) : null}
              
              {/* 프로그레스 오버레이 */}
              <VideoGenerationProgress 
                progress={progress}
                isVisible={isGeneratingThisSlot}
                webhookStatus={webhookStatus}
                elapsedMinutes={elapsedMinutes}
                elapsedSeconds={elapsedSeconds}
              />
            </div>
            );
          })}
        </div>

        {/* Controls */}
        {showControls && (
          <div className="flex justify-center p-4">
            <CanvasControls
              selectedResolution={selectedResolution}
              selectedSize={selectedSize}
              onPromptModalOpen={onPromptModalOpen}
              onGenerateClick={onGenerateClick}
              isGenerating={isGenerating}
              canGenerate={canGenerate}
              selectedDuration={selectedDuration}
              onDurationChange={onDurationChange}
              onDownloadClick={onDownloadClick}
              activeVideo={activeVideo}
              isDownloading={isDownloading}
            />
          </div>
        )}
      </div>

      {/* Right History Panel */}
      <CanvasHistoryPanel
        generatedVideos={generatedVideos}
        onVideoSelect={onVideoSelect}
        selectedHistoryVideos={selectedHistoryVideos}
      />
    </div>
  );
}