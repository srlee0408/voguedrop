import { Bell, Edit2, Check, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface HeaderProps {
  onLibraryClick?: () => void
  activePage?: 'clip' | 'edit'
  projectTitle?: string
  onEditClick?: () => void
  onProjectTitleChange?: (title: string) => void
  autoSaveStatus?: AutoSaveStatus
  lastAutoSavedAt?: Date | null
  autoSaveError?: string | null
}

export function Header({ 
  onLibraryClick, 
  activePage = 'clip',
  projectTitle,
  onEditClick,
  onProjectTitleChange,
  autoSaveStatus = 'idle',
  lastAutoSavedAt,
  autoSaveError
}: HeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(projectTitle || '')
  const [, forceUpdate] = useState({})
  
  // Update tempTitle when projectTitle changes
  useEffect(() => {
    setTempTitle(projectTitle || '')
  }, [projectTitle])
  
  // Update save status text periodically
  useEffect(() => {
    if (autoSaveStatus === 'saved' && lastAutoSavedAt) {
      const interval = setInterval(() => {
        forceUpdate({})
      }, 30000) // Update every 30 seconds
      
      return () => clearInterval(interval)
    }
  }, [autoSaveStatus, lastAutoSavedAt])
  
  // Format save status text
  const getSaveStatusText = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return 'Saving...'
      case 'saved':
        if (lastAutoSavedAt) {
          const now = new Date()
          const diff = Math.floor((now.getTime() - lastAutoSavedAt.getTime()) / 1000)
          if (diff < 5) {
            return 'Saved'
          } else if (diff < 60) {
            return 'All changes saved'
          } else {
            const minutes = Math.floor(diff / 60)
            return `Saved ${minutes}m ago`
          }
        }
        return 'All changes saved'
      case 'error':
        return 'Failed to save'
      default:
        return ''
    }
  }
  
  // Get save status color
  const getSaveStatusColor = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return 'text-gray-400'
      case 'saved':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-400'
    }
  }
  
  // Get save status icon
  const getSaveStatusIcon = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return <Loader2 className="w-3 h-3 animate-spin" />
      case 'saved':
        return <Check className="w-3 h-3" />
      case 'error':
        return <AlertCircle className="w-3 h-3" />
      default:
        return null
    }
  }
  return (
    <header className="bg-background/95 backdrop-blur-sm py-4 px-6 flex justify-between items-center border-b border-border">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-2xl font-bold text-primary tracking-tight">
          vogue drop
        </Link>
        {activePage === 'edit' && (
          <div className="flex items-center gap-4">
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
            
            {/* Auto-save status */}
            {autoSaveStatus !== 'idle' && (
              <div className={`flex items-center gap-1.5 text-xs ${getSaveStatusColor()}`}>
                {getSaveStatusIcon()}
                <span>{getSaveStatusText()}</span>
                {autoSaveStatus === 'error' && autoSaveError && (
                  <span className="text-xs text-red-400" title={autoSaveError}>
                    ⓘ
                  </span>
                )}
              </div>
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