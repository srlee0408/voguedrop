import { BaseModal } from "./BaseModal"
import { Camera, Video, Upload } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { useState } from "react"

interface CameraModalProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (imageData: string) => void
}

export function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera")
  const [isCameraActive, setIsCameraActive] = useState(false)

  const handleCapture = () => {
    // Simulate camera capture
    onCapture("/placeholder.svg?height=640&width=480&query=camera-captured-image")
    onClose()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        onCapture(e.target?.result as string)
        onClose()
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Camera / Upload">
      <div className="flex flex-col gap-4">
        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setActiveTab("camera")}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === "camera"
                ? "bg-white text-black shadow-sm"
                : "text-gray-600 hover:text-black"
            }`}
          >
            <Camera className="w-4 h-4 inline-block mr-2" />
            Camera
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === "upload"
                ? "bg-white text-black shadow-sm"
                : "text-gray-600 hover:text-black"
            }`}
          >
            <Upload className="w-4 h-4 inline-block mr-2" />
            Upload
          </button>
        </div>

        {/* Content */}
        {activeTab === "camera" ? (
          <div className="space-y-4">
            <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden relative">
              {isCameraActive ? (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <Video className="w-16 h-16 text-gray-500" />
                  <div className="absolute bottom-4 left-4 text-sm text-gray-600">
                    Camera preview
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Camera is not active</p>
                    <Button
                      onClick={() => setIsCameraActive(true)}
                      className="bg-primary text-black hover:bg-primary/90"
                    >
                      Start Camera
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {isCameraActive && (
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setIsCameraActive(false)}
                  className="text-black"
                >
                  Stop Camera
                </Button>
                <Button
                  onClick={handleCapture}
                  className="bg-primary text-black hover:bg-primary/90"
                >
                  Capture Photo
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="text-center">
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Drag and drop your image here, or click to browse
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Supports: JPG, PNG, GIF (max 10MB)
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="image-upload"
                />
                <Button
                  onClick={() => document.getElementById("image-upload")?.click()}
                  className="bg-primary text-black hover:bg-primary/90"
                >
                  Browse Files
                </Button>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500">
              Uploaded images will be used as reference for your fashion generation
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  )
}