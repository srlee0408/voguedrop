import { X } from "lucide-react"

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function BaseModal({ isOpen, onClose, title, children, className = "bg-gray-800" }: BaseModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`${className} w-full max-w-[1200px] max-h-[90vh] rounded-xl p-6 relative`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-white">{title}</h2>
          <button className="text-gray-400 hover:text-gray-300" onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}