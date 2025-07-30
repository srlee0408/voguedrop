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
  const [, setUploadedImage] = useState<string | null>(null)
  const [generatedVideos] = useState<GeneratedVideo[]>([])
  const [isGenerating] = useState(false)
  const [selectedEffects, setSelectedEffects] = useState<EffectTemplateWithMedia[]>([])
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null)
  
  // 페이지 이탈 방지
  useBeforeUnload(isGenerating, '영상 생성이 진행 중입니다. 페이지를 벗어나면 생성이 취소됩니다.')
  
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
        // 선택 해제
        return prev.filter(e => e.id !== effect.id);
      } else {
        // 선택 추가
        return [...prev, effect];
      }
    });
  };

  const handleVideoSelect = (video: GeneratedVideo) => {
    setSelectedVideoId(video.id);
    // TODO: 비디오 재생 로직 추가
  };

  // TODO: 영상 생성 기능 구현 예정
  // const handleGenerateVideo = async () => {
  //   if (!uploadedImage) {
  //     setGenerationError('이미지를 먼저 업로드해주세요.');
  //     return;
  //   }

  //   if (selectedEffects.length === 0) {
  //     setGenerationError('최소 하나의 효과를 선택해주세요.');
  //     return;
  //   }

  //   setIsGenerating(true);
  //   setGenerationError(null);

  //   try {
  //     const response = await fetch('/api/canvas/generate', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         imageUrl: uploadedImage,
  //         selectedEffects,
  //         basePrompt: promptText,
  //         modelType: 'seedance',
  //       }),
  //     });

  //     const data = await response.json();

  //     if (!response.ok) {
  //       throw new Error(data.error || '영상 생성에 실패했습니다.');
  //     }

  //     // 생성된 영상을 목록에 추가
  //     const newVideo: GeneratedVideo = {
  //       id: data.generationId || Date.now(),
  //       url: data.videoUrl,
  //       thumbnail: uploadedImage,
  //       createdAt: new Date(),
  //     };

  //     setGeneratedVideos(prev => {
  //       // 최대 3개까지만 유지
  //       const updated = [newVideo, ...prev].slice(0, 3);
  //       return updated;
  //     });
      
  //     // 성공 메시지와 에러 초기화
  //     setGenerationError(null);
  //     console.log('Video generated successfully:', data);
      
  //     // 생성된 비디오 선택
  //     setSelectedVideoId(newVideo.id);
      
  //     // 성공 피드백 (간단한 토스트나 알림 - 옵션)
  //     // toast.success('영상이 성공적으로 생성되었습니다!');
      
  //   } catch (error) {
  //     console.error('Video generation error:', error);
  //     setGenerationError(
  //       error instanceof Error 
  //         ? error.message 
  //         : '영상 생성 중 오류가 발생했습니다.'
  //     );
  //   } finally {
  //     setIsGenerating(false);
  //   }
  // };


  const libraryClips = [
    {
      title: "Evening Elegance",
      date: "2025-07-15",
      duration: "01:24",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=360&h=640&fit=crop",
    },
    { title: "Urban Vibes", date: "2025-07-14", duration: "02:15", image: "https://readdy.ai/api/search-image?query=Urban street fashion photography with modern city backdrop&width=840&height=360&seq=6&orientation=landscape" },
    {
      title: "Avant-garde Vision",
      date: "2025-07-13",
      duration: "03:42",
      image: "https://readdy.ai/api/search-image?query=Avant-garde fashion editorial with experimental styling&width=360&height=640&seq=7&orientation=portrait",
    },
    { title: "Luxury Details", date: "2025-07-12", duration: "02:56", image: "https://readdy.ai/api/search-image?query=Luxury fashion detail shot with premium materials and elegant styling&width=400&height=400&seq=8&orientation=square" },
  ]


  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header onLibraryClick={() => setIsLibraryOpen(true)} />

      <div className="flex flex-1">
        <LeftPanel
          isPrompterOpen={isPrompterOpen}
          onPrompterToggle={() => setIsPrompterOpen(!isPrompterOpen)}
          promptText={promptText}
          onPromptChange={setPromptText}
          onImageUpload={setUploadedImage}
          generatedVideos={generatedVideos}
          isGenerating={isGenerating}
          generationError={generationError}
          onEffectModalOpen={() => setIsEffectModalOpen(true)}
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
        />
      </div>

      <LibraryModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} clips={libraryClips} />
      
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
  )
}