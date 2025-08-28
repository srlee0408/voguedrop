import { Bell, Edit2, Check, Loader2, AlertCircle, User } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useLibraryInfinitePrefetch } from "@/features/media-library/_components/hooks/useLibraryInfinitePrefetch"
import { SettingsModal } from '@/shared/components/modals/SettingsModal'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface HeaderProps {
  onLibraryClick?: () => void
  activePage?: 'clip' | 'edit'
  projectTitle?: string
  onEditClick?: () => void
  onProjectTitleChange?: (title: string) => void
  saveStatus?: SaveStatus
  saveError?: string | null
  onSaveProject?: () => void
}

export function Header({ 
  onLibraryClick, 
  activePage = 'clip',
  projectTitle,
  onEditClick,
  onProjectTitleChange,
  saveStatus = 'idle',
  saveError,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSaveProject: _ = () => {}
}: HeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(projectTitle || '')
  const [showSaveStatus, setShowSaveStatus] = useState(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Infinite Query 프리페칭 훅 추가
  const { prefetchOnHoverInfinite, isEnabled: isPrefetchEnabled } = useLibraryInfinitePrefetch()
  
  // Update tempTitle when projectTitle changes
  useEffect(() => {
    setTempTitle(projectTitle || '')
  }, [projectTitle])
  
  // Show save status temporarily
  useEffect(() => {
    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    
    if (saveStatus === 'saving') {
      // Show immediately when saving
      setShowSaveStatus(true)
    } else if (saveStatus === 'saved') {
      // Keep showing for 2 seconds after saved, then hide
      setShowSaveStatus(true)
      hideTimeoutRef.current = setTimeout(() => {
        setShowSaveStatus(false)
      }, 2000)
    } else if (saveStatus === 'error') {
      // Show error persistently
      setShowSaveStatus(true)
    } else {
      // Hide for idle state
      setShowSaveStatus(false)
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [saveStatus])
  
  // Format save status text (simplified)
  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...'
      case 'saved':
        return 'Saved'
      case 'error':
        return 'Failed to save'
      default:
        return ''
    }
  }
  
  // Get save status color
  const getSaveStatusColor = () => {
    switch (saveStatus) {
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
    switch (saveStatus) {
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
    <header className="bg-background/95 backdrop-blur-sm py-4 px-6 flex justify-between items-center border-b border-border z-[9999]">
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
            
            {/* Save status */}
            <div 
              className={`flex items-center gap-1.5 text-xs ${getSaveStatusColor()} transition-all duration-300 ${
                showSaveStatus ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {getSaveStatusIcon()}
              <span>{getSaveStatusText()}</span>
              {saveStatus === 'error' && saveError && (
                <span className="text-xs text-red-400" title={saveError}>
                  ⓘ
                </span>
              )}
            </div>
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
          onMouseEnter={isPrefetchEnabled ? prefetchOnHoverInfinite : undefined}
          onTouchStart={isPrefetchEnabled ? prefetchOnHoverInfinite : undefined}
        >
          Library
        </button>
      </div>
      <div className="flex items-center space-x-4 relative">
        <div className="w-8 h-8 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
          <Bell className="w-5 h-5" />
        </div>
        <button
          className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-gray-600 hover:ring-gray-400 transition focus:outline-none focus:ring-gray-400 bg-surface-secondary flex items-center justify-center"
          title="Open profile menu"
          onClick={() => setIsSettingsOpen(prev => !prev)}
        >
          <User className="w-5 h-5 text-text-primary" />
        </button>
        {isSettingsOpen && (
          <div className="absolute right-0 top-full z-[10000]">
            <SettingsModal isOpen={isSettingsOpen} onCloseAction={() => setIsSettingsOpen(false)} />
          </div>
        )}
      </div>
    </header>
  )
}