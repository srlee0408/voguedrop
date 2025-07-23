import { BaseModal } from "./BaseModal"
import { User, Users, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface ModelOption {
  id: string
  name: string
  description: string
  imageUrl: string
  category: "male" | "female" | "unisex"
}

interface ModelModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectModel: (modelId: string) => void
  selectedModelId?: string
}

const modelOptions: ModelOption[] = [
  {
    id: "model-1",
    name: "Classic Male",
    description: "Athletic build, 180cm",
    imageUrl: "/placeholder.svg?height=300&width=200&query=male-model-1",
    category: "male"
  },
  {
    id: "model-2",
    name: "Urban Female",
    description: "Contemporary style, 170cm",
    imageUrl: "/placeholder.svg?height=300&width=200&query=female-model-1",
    category: "female"
  },
  {
    id: "model-3",
    name: "Fashion Forward",
    description: "Androgynous look, 175cm",
    imageUrl: "/placeholder.svg?height=300&width=200&query=unisex-model-1",
    category: "unisex"
  },
  {
    id: "model-4",
    name: "Street Style Male",
    description: "Casual aesthetic, 185cm",
    imageUrl: "/placeholder.svg?height=300&width=200&query=male-model-2",
    category: "male"
  },
  {
    id: "model-5",
    name: "Elegant Female",
    description: "Sophisticated look, 168cm",
    imageUrl: "/placeholder.svg?height=300&width=200&query=female-model-2",
    category: "female"
  },
  {
    id: "model-6",
    name: "Minimalist",
    description: "Clean aesthetic, 178cm",
    imageUrl: "/placeholder.svg?height=300&width=200&query=unisex-model-2",
    category: "unisex"
  }
]

export function ModelModal({ isOpen, onClose, onSelectModel, selectedModelId }: ModelModalProps) {
  const [filter, setFilter] = useState<"all" | "male" | "female" | "unisex">("all")
  const [selectedModel, setSelectedModel] = useState<string>(selectedModelId || "")

  const filteredModels = filter === "all" 
    ? modelOptions 
    : modelOptions.filter(model => model.category === filter)

  const handleApply = () => {
    if (selectedModel) {
      onSelectModel(selectedModel)
      onClose()
    }
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Select Model">
      <div className="flex flex-col gap-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-2 px-3 rounded-md transition-colors text-sm ${
              filter === "all"
                ? "bg-white text-black shadow-sm"
                : "text-gray-600 hover:text-black"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("male")}
            className={`flex-1 py-2 px-3 rounded-md transition-colors text-sm ${
              filter === "male"
                ? "bg-white text-black shadow-sm"
                : "text-gray-600 hover:text-black"
            }`}
          >
            <User className="w-3 h-3 inline-block mr-1" />
            Male
          </button>
          <button
            onClick={() => setFilter("female")}
            className={`flex-1 py-2 px-3 rounded-md transition-colors text-sm ${
              filter === "female"
                ? "bg-white text-black shadow-sm"
                : "text-gray-600 hover:text-black"
            }`}
          >
            <User className="w-3 h-3 inline-block mr-1" />
            Female
          </button>
          <button
            onClick={() => setFilter("unisex")}
            className={`flex-1 py-2 px-3 rounded-md transition-colors text-sm ${
              filter === "unisex"
                ? "bg-white text-black shadow-sm"
                : "text-gray-600 hover:text-black"
            }`}
          >
            <Users className="w-3 h-3 inline-block mr-1" />
            Unisex
          </button>
        </div>

        {/* Model Grid */}
        <div className="grid grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-1">
          {filteredModels.map((model) => (
            <div
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                selectedModel === model.id
                  ? "border-primary shadow-lg"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="relative">
                <img
                  src={model.imageUrl}
                  alt={model.name}
                  className="w-full h-48 object-cover"
                />
                {selectedModel === model.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-black" />
                  </div>
                )}
              </div>
              <div className="p-3 bg-white">
                <h4 className="font-medium text-sm text-black">{model.name}</h4>
                <p className="text-xs text-gray-600 mt-1">{model.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} className="text-black">
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedModel}
            className="bg-primary text-black hover:bg-primary/90"
          >
            Apply Model
          </Button>
        </div>
      </div>
    </BaseModal>
  )
}