import { Bell } from "lucide-react"
import Link from "next/link"

interface HeaderProps {
  onLibraryClick?: () => void
}

export function Header({ onLibraryClick }: HeaderProps) {
  return (
    <header className="bg-background/95 backdrop-blur-sm py-4 px-6 flex justify-between items-center border-b border-border">
      <Link href="/" className="text-2xl font-bold text-primary tracking-tight">
        vogue drop
      </Link>
      <div className="flex space-x-8">
        <a href="#" className="font-medium text-sm text-primary hover:text-primary/80 transition-colors">
          Clip
        </a>
        <button className="font-medium text-sm text-text-secondary hover:text-text-primary transition-colors">Edit</button>
        <button className="font-medium text-sm text-text-secondary hover:text-text-primary transition-colors" onClick={onLibraryClick}>
          Library
        </button>
      </div>
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
          <Bell className="w-5 h-5" />
        </div>
        <div className="w-10 h-10 bg-surface-secondary rounded-full flex items-center justify-center">
          <span className="text-xs text-text-primary">Matt</span>
        </div>
      </div>
    </header>
  )
}