"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Header } from "@/components/layout/Header"
import { LeftPanel } from "./_components/LeftPanel"
import { Canvas } from "./_components/Canvas"
import { LibraryModal } from "@/components/modals/LibraryModal"
import { EffectModal } from "@/components/modals/EffectModal"
import { PromptModal } from "@/components/modals/PromptModal"
import { CameraModal } from "@/components/modals/CameraModal"
import { ModelModal } from "@/components/modals/ModelModal"
import type { GeneratedVideo } from "@/types/canvas"
import type { EffectTemplateWithMedia } from "@/types/database"
import { useBeforeUnload } from "./_hooks/useBeforeUnload"
import { EffectsDataProvider } from "./_hooks/useEffectsData"

export default function CanvasPage() {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isEffectModalOpen, setIsEffectModalOpen] = useState(false)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)
  const [isModelModalOpen, setIsModelModalOpen] = useState(false)
  const [isPrompterOpen, setIsPrompterOpen] = useState(false)
  const [isBrushPopupOpen, setIsBrushPopupOpen] = useState(false)
  const [promptText, setPromptText] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [brushSize, setBrushSize] = useState(20)
  const [selectedResolution] = useState("1:1")
  const [selectedSize] = useState("1024×1024")
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedEffects, setSelectedEffects] = useState<EffectTemplateWithMedia[]>([])
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<string>("5")
  
  // 페이지 이탈 방지
  useBeforeUnload(isGenerating, 'Video generation is in progress. Leaving the page will cancel the generation.')
  
  // 에러 메시지 자동 제거
  useEffect(() => {
    if (generationError) {
      const timer = setTimeout(() => {
        setGenerationError(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [generationError]);

  const handleEffectSelect = (effect: EffectTemplateWithMedia) => {
    setSelectedEffects(prev => {
      const isSelected = prev.some(e => e.id === effect.id);
      if (isSelected) {
        // Deselect
        return prev.filter(e => e.id !== effect.id);
      } else {
        // Add selection
        return [...prev, effect];
      }
    });
  };

  const handleEffectRemove = (effectId: number) => {
    setSelectedEffects(prev => prev.filter(e => e.id !== effectId));
  };

  const handleVideoSelect = (video: GeneratedVideo) => {
    setSelectedVideoId(video.id);
    // TODO: 비디오 재생 로직 추가
  };

  // Generate 버튼 활성화 조건 계산
  const canGenerate = !!uploadedImage && selectedEffects.length > 0;

  const handleGenerateVideo = async () => {
    if (!uploadedImage) {
      setGenerationError('Please upload an image first.');
      return;
    }

    if (selectedEffects.length === 0) {
      setGenerationError('Please select at least one effect.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const response = await fetch('/api/canvas/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: uploadedImage,
          selectedEffects,
          basePrompt: promptText,
          modelType: 'seedance',
          duration: selectedDuration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Video generation failed.');
      }

      // Process multiple video results
      const newVideos: GeneratedVideo[] = [];
      
      if (data.results && Array.isArray(data.results)) {
        data.results.forEach((result: {
          success: boolean;
          generationId?: number;
          videoUrl?: string;
          modelType?: string;
          error?: string;
        }) => {
          if (result.success && result.videoUrl) {
            newVideos.push({
              id: result.generationId || Date.now() + Math.random(),
              url: result.videoUrl,
              thumbnail: uploadedImage,
              createdAt: new Date(),
              modelType: result.modelType as "seedance" | "hailo" | undefined
            });
          }
        });
      }

      if (newVideos.length === 0) {
        throw new Error('No videos were generated successfully.');
      }

      setGeneratedVideos(prev => {
        // Add new videos to the beginning, keep max 4
        const updated = [...newVideos, ...prev].slice(0, 4);
        return updated;
      });
      
      // 성공 메시지와 에러 초기화
      setGenerationError(null);
      console.log('Videos generated successfully:', newVideos);
      
      // Select first generated video
      if (newVideos.length > 0) {
        setSelectedVideoId(newVideos[0].id);
      }
      
    } catch (error) {
      console.error('Video generation error:', error);
      setGenerationError(
        error instanceof Error 
          ? error.message 
          : 'An error occurred during video generation.'
      );
    } finally {
      setIsGenerating(false);
    }
  };




  return (
    <EffectsDataProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header onLibraryClick={() => setIsLibraryOpen(true)} />

        <div className="flex flex-1">
          <LeftPanel
            isPrompterOpen={isPrompterOpen}
            onPrompterToggle={() => setIsPrompterOpen(!isPrompterOpen)}
            promptText={promptText}
            onPromptChange={setPromptText}
            onImageUpload={setUploadedImage}
            isGenerating={isGenerating}
            generationError={generationError}
            onEffectModalOpen={() => setIsEffectModalOpen(true)}
            selectedEffects={selectedEffects}
            onEffectRemove={handleEffectRemove}
          />

          <Canvas
            selectedResolution={selectedResolution}
            selectedSize={selectedSize}
            brushSize={brushSize}
            isBrushPopupOpen={isBrushPopupOpen}
            onPromptModalOpen={() => setIsPromptModalOpen(true)}
            onBrushToggle={() => setIsBrushPopupOpen(!isBrushPopupOpen)}
            onBrushSizeChange={setBrushSize}
            showControls={true}
            generatedVideos={generatedVideos}
            selectedVideoId={selectedVideoId}
            onVideoSelect={handleVideoSelect}
            onGenerateClick={handleGenerateVideo}
            isGenerating={isGenerating}
            canGenerate={canGenerate}
            selectedDuration={selectedDuration}
            onDurationChange={setSelectedDuration}
          />
        </div>

        <LibraryModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} />
        
        <EffectModal 
          isOpen={isEffectModalOpen} 
          onClose={() => setIsEffectModalOpen(false)} 
          onSelectEffect={handleEffectSelect}
          selectedEffects={selectedEffects}
        />
        
        <PromptModal
          isOpen={isPromptModalOpen}
          onClose={() => setIsPromptModalOpen(false)}
          promptText={promptText}
          negativePrompt={negativePrompt}
          onPromptChange={setPromptText}
          onNegativePromptChange={setNegativePrompt}
          onApply={() => console.log("Generating with prompt:", promptText)}
        />
        
        <CameraModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onCapture={(imageData) => console.log("Captured image:", imageData)}
        />
        
        <ModelModal
          isOpen={isModelModalOpen}
          onClose={() => setIsModelModalOpen(false)}
          onSelectModel={setSelectedModelId}
          selectedModelId={selectedModelId}
        />
      </div>
    </EffectsDataProvider>
  )
}