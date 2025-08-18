import { Bell, Edit2 } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

interface HeaderProps {
  onLibraryClick?: () => void
  activePage?: 'clip' | 'edit'
  projectTitle?: string
  onEditClick?: () => void
  onProjectTitleChange?: (title: string) => void
}

export function Header({ 
  onLibraryClick, 
  activePage = 'clip',
  projectTitle,
  onEditClick,
  onProjectTitleChange
}: HeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(projectTitle || '')
  
  // Update tempTitle when projectTitle changes
  useEffect(() => {
    setTempTitle(projectTitle || '')
  }, [projectTitle])
  return (
    <header className="bg-background/95 backdrop-blur-sm py-4 px-6 flex justify-between items-center border-b border-border">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-2xl font-bold text-primary tracking-tight">
          vogue drop
        </Link>
        {activePage === 'edit' && (
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={() => {
                  const finalTitle = tempTitle.trim() || projectTitle || 'Untitled Project'
                  onProjectTitleChange?.(finalTitle)
                  setIsEditingTitle(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const finalTitle = tempTitle.trim() || projectTitle || 'Untitled Project'
                    onProjectTitleChange?.(finalTitle)
                    setIsEditingTitle(false)
                  } else if (e.key === 'Escape') {
                    setTempTitle(projectTitle || '')
                    setIsEditingTitle(false)
                  }
                }}
                className="input-base input-sm font-medium"
                autoFocus
              />
            ) : (
              <button
                onClick={() => {
                  setTempTitle(projectTitle || '')
                  setIsEditingTitle(true)
                }}
                className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-surface-secondary transition-colors"
              >
                <span className="text-sm font-medium text-text-secondary">
                  {projectTitle || 'Untitled Project'}
                </span>
                <Edit2 className="w-3 h-3 text-text-tertiary" />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex space-x-8">
        <Link 
          href="/canvas" 
          className={`font-medium text-sm transition-colors ${
            activePage === 'clip' 
              ? 'text-primary hover:text-primary/80' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Clip
        </Link>
        <button 
          className={`font-medium text-sm transition-colors ${
            activePage === 'edit' 
              ? 'text-primary hover:text-primary/80' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
          onClick={activePage === 'clip' ? onEditClick : undefined}
        >
          Edit
        </button>
        <button 
          className="font-medium text-sm text-text-secondary hover:text-text-primary transition-colors" 
          onClick={onLibraryClick}
        >
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