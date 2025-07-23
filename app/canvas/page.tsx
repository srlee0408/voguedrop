"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Header } from "@/components/layout/Header"
import { LeftPanel } from "@/components/canvas/LeftPanel"
import { CanvasArea } from "@/components/canvas/CanvasArea"
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
  const [selectedResolution, setSelectedResolution] = useState("1:1")
  const [selectedSize, setSelectedSize] = useState("1024×1024")
  const [favorites, setFavorites] = useState<boolean[]>([false, false, false])
  const [selectedModelId, setSelectedModelId] = useState<string>("")

  const effects = [
    { name: "RGB Split", image: "/placeholder.svg?height=400&width=300" },
    { name: "Wave Flow", image: "/placeholder.svg?height=400&width=300" },
    { name: "Holo Prism", image: "/placeholder.svg?height=400&width=300" },
    { name: "Light Trail", image: "/placeholder.svg?height=400&width=300" },
  ]

  const libraryClips = [
    {
      title: "Evening Elegance",
      date: "2025-07-15",
      duration: "01:24",
      image: "/placeholder.svg?height=640&width=360",
    },
    { title: "Urban Vibes", date: "2025-07-14", duration: "02:15", image: "/placeholder.svg?height=360&width=840" },
    {
      title: "Avant-garde Vision",
      date: "2025-07-13",
      duration: "03:42",
      image: "/placeholder.svg?height=640&width=360",
    },
    { title: "Luxury Details", date: "2025-07-12", duration: "02:56", image: "/placeholder.svg?height=400&width=400" },
  ]

  const toggleFavorite = (index: number) => {
    const newFavorites = [...favorites]
    newFavorites[index] = !newFavorites[index]
    setFavorites(newFavorites)
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
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

        <CanvasArea
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          selectedResolution={selectedResolution}
          selectedSize={selectedSize}
          brushSize={brushSize}
          isBrushPopupOpen={isBrushPopupOpen}
          onPromptModalOpen={() => setIsPromptModalOpen(true)}
          onBrushToggle={() => setIsBrushPopupOpen(!isBrushPopupOpen)}
          onBrushSizeChange={setBrushSize}
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