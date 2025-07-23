import { Bell } from "lucide-react"
import Link from "next/link"

interface HeaderProps {
  onLibraryClick?: () => void
}

export function Header({ onLibraryClick }: HeaderProps) {
  return (
    <header className="bg-black/95 backdrop-blur-sm py-4 px-6 flex justify-between items-center border-b border-gray-800">
      <Link href="/" className="text-2xl font-bold text-primary tracking-tight">
        vogue drop
      </Link>
      <div className="flex space-x-8">
        <a href="#" className="font-medium text-sm text-primary hover:text-primary/80 transition-colors">
          Clip
        </a>
        <button className="font-medium text-sm text-gray-300 hover:text-white transition-colors">Edit</button>
        <button className="font-medium text-sm text-gray-300 hover:text-white transition-colors" onClick={onLibraryClick}>
          Library
        </button>
      </div>
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer">
          <Bell className="w-5 h-5" />
        </div>
        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
          <span className="text-xs text-white">Matt</span>
        </div>
      </div>
    </header>
  )
}