import { X, Info, Search, Play, Download, Pin } from "lucide-react"
import { Input } from "@/components/ui/input"
import Image from "next/image"

interface LibraryClip {
  title: string
  date: string
  duration: string
  image: string
}

interface LibraryModalProps {
  isOpen: boolean
  onClose: () => void
  clips: LibraryClip[]
}

export function LibraryModal({ isOpen, onClose, clips }: LibraryModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl p-6 w-[1000px] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-medium text-white">Library</h3>
          <button className="text-gray-400 hover:text-gray-300" onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Info className="w-4 h-4 text-primary" />
          <p className="text-sm text-gray-400">
            Only favorited videos are permanently stored. Other videos will be automatically deleted after 7 days.
          </p>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <Input
              type="date"
              className="bg-gray-700 text-white text-sm border-gray-600 focus:border-primary"
              defaultValue="2025-07-01"
            />
            <span className="text-gray-400">to</span>
            <Input
              type="date"
              className="bg-gray-700 text-white text-sm border-gray-600 focus:border-primary"
              defaultValue="2025-07-15"
            />
          </div>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search clips..."
              className="bg-gray-700 text-white text-sm pl-10 pr-4 py-2 w-64 border-gray-600 focus:border-primary"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 overflow-y-auto flex-1 auto-rows-[200px]">
          {clips.map((clip, index) => (
            <div
              key={index}
              className={`bg-gray-700 rounded-lg overflow-hidden ${index === 0 || index === 2 ? "col-span-3 row-span-2" : index === 1 ? "col-span-6" : "col-span-4"}`}
            >
              <div className="relative group h-full">
                <Image
                  src={clip.image || "/placeholder.svg"}
                  alt={clip.title}
                  className="w-full h-full object-cover"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white">
                    <Play className="w-4 h-4" />
                  </button>
                  <button className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white">
                    <Pin className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <h4 className="text-white text-sm font-medium mb-1">{clip.title}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{clip.date}</span>
                  <span className="text-gray-400 text-xs">{clip.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}