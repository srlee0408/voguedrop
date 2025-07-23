"use client"

import type React from "react"
import { useState } from "react"
import { Header } from "@/components/layout/Header"
import { LeftPanel } from "@/components/canvas/LeftPanel"
import { Canvas } from "@/components/canvas/Canvas"
import { LibraryModal } from "@/components/modals/LibraryModal"
import { EffectModal } from "@/components/modals/EffectModal"
import { PromptModal } from "@/components/modals/PromptModal"
import { CameraModal } from "@/components/modals/CameraModal"
import { ModelModal } from "@/components/modals/ModelModal"

export default function CanvasPage() {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isEffectModalOpen, setIsEffectModalOpen] = useState(false)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)
  const [isModelModalOpen, setIsModelModalOpen] = useState(false)
  const [isPrompterOpen, setIsPrompterOpen] = useState(false)
  const [isBrushPopupOpen, setIsBrushPopupOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [promptText, setPromptText] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [brushSize, setBrushSize] = useState(20)
  const [selectedResolution] = useState("1:1")
  const [selectedSize] = useState("1024×1024")
  const [selectedModelId, setSelectedModelId] = useState<string>("")

  const effects = [
    { name: "RGB Split", image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=400&fit=crop" },
    { name: "Wave Flow", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=400&fit=crop" },
    { name: "Holo Prism", image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300&h=400&fit=crop" },
    { name: "Light Trail", image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=400&fit=crop" },
  ]

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
          isPlaying={isPlaying}
          onPlayToggle={() => setIsPlaying(!isPlaying)}
          effects={effects}
          isPrompterOpen={isPrompterOpen}
          onPrompterToggle={() => setIsPrompterOpen(!isPrompterOpen)}
          promptText={promptText}
          onPromptChange={setPromptText}
          onEffectClick={() => setIsEffectModalOpen(true)}
          onCameraClick={() => setIsCameraModalOpen(true)}
          onModelClick={() => setIsModelModalOpen(true)}
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
        />
      </div>

      <LibraryModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} clips={libraryClips} />
      
      <EffectModal isOpen={isEffectModalOpen} onClose={() => setIsEffectModalOpen(false)} effects={effects} />
      
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