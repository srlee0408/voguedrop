'use client';

import { useState, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { X, Info, Loader2, Video, Folder, Upload } from 'lucide-react';
import { LibraryModalBaseProps, LibraryCategory } from '@/types/library-modal';
import { LibraryVideo, LibraryProject, UserUploadedVideo, LibraryItem } from '@/types/video-editor';
import { useLibraryData } from './hooks/useLibraryData';
import { LibraryCard } from './components/LibraryCard';
import { LibrarySidebar } from './components/LibrarySidebar';
import { LibraryUpload } from './components/LibraryUpload';

export function LibraryModalBase({ isOpen, onClose, config }: LibraryModalBaseProps) {
  const pathname = usePathname();
  const [activeCategory, setActiveCategory] = useState<LibraryCategory>('clips');
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [isAdding, setIsAdding] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloadingVideos, setDownloadingVideos] = useState<Set<string>>(new Set());
  
  const { 
    clipItems, 
    projectItems, 
    uploadItems, 
    counts, 
    isLoading, 
    error,
    updateUploadItems,
    updateCounts
  } = useLibraryData(isOpen);

  // 선택 모드 핸들러
  const handleItemSelect = useCallback((itemId: string) => {
    if (!config.selection?.enabled) return;
    
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      if (newMap.has(itemId)) {
        // Deselect
        const removedOrder = newMap.get(itemId)!;
        newMap.delete(itemId);
        // Update order numbers
        newMap.forEach((order, id) => {
          if (order > removedOrder) {
            newMap.set(id, order - 1);
          }
        });
      } else {
        // Select (최대 개수 체크)
        if (newMap.size < (config.selection?.maxItems || 10)) {
          newMap.set(itemId, newMap.size + 1);
        }
      }
      return newMap;
    });
  }, [config.selection]);

  // 선택된 아이템 추가 핸들러
  const handleAddSelected = useCallback(async () => {
    if (!config.selection?.onSelect || selectedItems.size === 0) return;
    
    setIsAdding(true);
    try {
      // Sort items by selection order
      const sortedItemIds = Array.from(selectedItems.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([itemId]) => itemId);
      
      const selectedLibraryItems: LibraryItem[] = [];
      
      // Map selected IDs to actual items
      if (activeCategory === 'clips') {
        sortedItemIds.forEach(id => {
          const clip = clipItems.find(c => c.id === id);
          if (clip) {
            selectedLibraryItems.push({ type: 'clip', data: clip });
          }
        });
      } else if (activeCategory === 'projects') {
        sortedItemIds.forEach(id => {
          const project = projectItems.find(p => p.id.toString() === id);
          if (project) {
            selectedLibraryItems.push({ type: 'project', data: project });
          }
        });
      } else {
        sortedItemIds.forEach(id => {
          const upload = uploadItems.find(u => u.id.toString() === id);
          if (upload) {
            selectedLibraryItems.push({ type: 'upload', data: upload });
          }
        });
      }
      
      await config.selection.onSelect(selectedLibraryItems);
      onClose();
    } finally {
      setIsAdding(false);
    }
  }, [config.selection, selectedItems, activeCategory, clipItems, projectItems, uploadItems, onClose]);

  // 카테고리 변경 핸들러
  const handleCategoryChange = useCallback((category: LibraryCategory) => {
    if (category !== activeCategory) {
      setSelectedItems(new Map()); // Clear selection when changing category
      setActiveCategory(category);
    }
  }, [activeCategory]);

  // 다운로드 핸들러
  const handleDownload = useCallback(async (item: LibraryVideo | LibraryProject | (UserUploadedVideo & { url?: string }), type: 'clip' | 'project' | 'upload') => {
    if (!config.download?.enabled) return;
    
    let url: string | undefined;
    let filename: string;
    let itemId: string;
    
    if (type === 'clip') {
      const clip = item as LibraryVideo;
      url = clip.output_video_url;
      itemId = clip.job_id || String(clip.id);
      const date = new Date(clip.created_at).toISOString().split('T')[0];
      const effectName = clip.selected_effects[0]?.name.toLowerCase().replace(/\s+/g, '-') || 'video';
      filename = `voguedrop_${date}_${effectName}.mp4`;
    } else if (type === 'project') {
      const project = item as LibraryProject;
      url = project.latest_video_url;
      itemId = String(project.id);
      const date = new Date(project.updated_at).toISOString().split('T')[0];
      const projectName = project.project_name.toLowerCase().replace(/\s+/g, '-');
      filename = `voguedrop_project_${date}_${projectName}.mp4`;
    } else {
      const upload = item as UserUploadedVideo & { url?: string };
      url = upload.url;
      itemId = String(upload.id);
      const date = new Date(upload.uploaded_at).toISOString().split('T')[0];
      const fileName = upload.file_name.toLowerCase().replace(/\s+/g, '-');
      filename = `voguedrop_upload_${date}_${fileName}`;
    }
    
    if (!url || downloadingVideos.has(itemId)) return;
    
    setDownloadingVideos(prev => new Set(prev).add(itemId));
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('다운로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setDownloadingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }, [config.download, downloadingVideos]);

  // 필터링된 아이템들
  const filteredItems = useMemo(() => {
    const filterByDate = (date: Date) => {
      const matchesStartDate = !startDate || date >= new Date(startDate);
      const matchesEndDate = !endDate || date <= new Date(endDate + 'T23:59:59');
      return matchesStartDate && matchesEndDate;
    };

    const filteredClips = config.dateFilter?.enabled 
      ? clipItems.filter(item => filterByDate(new Date(item.created_at)))
      : clipItems;
      
    const filteredProjects = config.dateFilter?.enabled
      ? projectItems.filter(item => filterByDate(new Date(item.updated_at)))
      : projectItems;
      
    const filteredUploads = config.dateFilter?.enabled
      ? uploadItems.filter(item => filterByDate(new Date(item.uploaded_at)))
      : uploadItems;

    // Sort clips with favorites first if favorites are enabled
    if (config.favorites?.enabled && config.favorites.favoriteIds) {
      filteredClips.sort((a, b) => {
        const aIsFavorite = config.favorites!.favoriteIds.has(a.job_id || String(a.id)) || a.is_favorite;
        const bIsFavorite = config.favorites!.favoriteIds.has(b.job_id || String(b.id)) || b.is_favorite;
        
        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return { clips: filteredClips, projects: filteredProjects, uploads: filteredUploads };
  }, [clipItems, projectItems, uploadItems, startDate, endDate, config.dateFilter, config.favorites]);

  // 업로드 완료 핸들러
  const handleUploadComplete = useCallback((video: UserUploadedVideo) => {
    updateUploadItems(video);
    updateCounts('uploads', 1);
  }, [updateUploadItems, updateCounts]);

  // 프로젝트 네비게이션 핸들러
  const handleProjectNavigate = useCallback((project: LibraryProject) => {
    // openProject가 활성화되지 않았으면 동작하지 않음
    if (!config.openProject?.enabled) return;
    
    // openProject에 onProjectNavigate가 있으면 사용
    if (config.openProject.onProjectNavigate) {
      config.openProject.onProjectNavigate(project.project_name);
      onClose();
    } 
    // 레거시 지원: onProjectSwitch가 있으면 사용
    else if (pathname === '/video-editor' && config.onProjectSwitch) {
      config.onProjectSwitch(project.project_name);
      onClose();
    } else {
      // 그 외의 경우 직접 이동 (완전한 페이지 리로드)
      const targetUrl = `/video-editor?projectName=${encodeURIComponent(project.project_name)}`;
      window.location.href = targetUrl;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, onClose, config.onProjectSwitch, config.openProject]);

  // Info 메시지
  const getInfoMessage = () => {
    switch(activeCategory) {
      case 'clips':
        return config.favorites?.enabled 
          ? "Only favorited videos are permanently stored. Other videos will be automatically deleted after 7 days."
          : "Your AI-generated video clips.";
      case 'projects':
        return "Your saved video projects with render history.";
      case 'uploads':
        return "Your uploaded videos (max 20MB per file).";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-[1200px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-2">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-medium text-white">
              {config.mode === 'selection' ? 'Video Library' : 'Library'}
            </h3>
            {config.selection?.enabled && selectedItems.size > 0 && (
              <span className="text-sm text-gray-400">
                {selectedItems.size} selected (max {config.selection.maxItems})
              </span>
            )}
          </div>
          <button className="text-gray-400 hover:text-gray-300" onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Info Bar */}
        {config.mode === 'view' && (
          <div className="flex items-center gap-2 px-6 pb-4">
            <Info className="w-4 h-4 text-primary" />
            <p className="text-sm text-gray-400">
              {getInfoMessage()}
            </p>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <LibrarySidebar
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
            counts={counts}
            dateFilter={config.dateFilter?.enabled ? {
              enabled: true,
              startDate,
              endDate,
              onStartDateChange: setStartDate,
              onEndDateChange: setEndDate
            } : undefined}
            uploadSection={activeCategory === 'uploads' ? (
              <LibraryUpload 
                onUploadComplete={handleUploadComplete}
              />
            ) : undefined}
            theme={config.theme}
          />
          
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Loading library...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <p className="text-red-400">{error}</p>
                </div>
              </div>
            ) : (
              <>
                {activeCategory === 'clips' && (
                  filteredItems.clips.length === 0 ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <Video className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">No clips found</p>
                        <p className="text-sm text-gray-500 mt-2">Generate videos in Canvas to see them here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {filteredItems.clips.map(clip => (
                        <LibraryCard
                          key={clip.id}
                          item={clip}
                          type="clip"
                          isSelected={selectedItems.has(clip.id)}
                          selectionOrder={selectedItems.get(clip.id)}
                          isFavorite={config.favorites?.favoriteIds?.has(clip.job_id || String(clip.id)) || clip.is_favorite}
                          isDownloading={downloadingVideos.has(clip.job_id || String(clip.id))}
                          onSelect={config.selection?.enabled ? () => handleItemSelect(clip.id) : undefined}
                          onFavoriteToggle={config.favorites?.enabled ? () => config.favorites!.onToggle(clip.job_id || String(clip.id)) : undefined}
                          onDownload={config.download?.enabled ? () => handleDownload(clip, 'clip') : undefined}
                          theme={config.theme}
                        />
                      ))}
                    </div>
                  )
                )}
                
                {activeCategory === 'projects' && (
                  filteredItems.projects.length === 0 ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <Folder className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">No projects found</p>
                        <p className="text-sm text-gray-500 mt-2">Save your video projects to see them here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {filteredItems.projects.map(project => (
                        <LibraryCard
                          key={project.id}
                          item={project}
                          type="project"
                          isSelected={selectedItems.has(project.id.toString())}
                          selectionOrder={selectedItems.get(project.id.toString())}
                          isDownloading={downloadingVideos.has(String(project.id))}
                          isCurrentProject={config.currentProjectName === project.project_name}
                          onSelect={config.selection?.enabled ? () => handleItemSelect(project.id.toString()) : undefined}
                          onDownload={config.download?.enabled ? () => handleDownload(project, 'project') : undefined}
                          onProjectNavigate={config.openProject?.enabled ? handleProjectNavigate : undefined}
                          theme={config.theme}
                        />
                      ))}
                    </div>
                  )
                )}
                
                {activeCategory === 'uploads' && (
                  filteredItems.uploads.length === 0 ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">No uploaded videos found</p>
                        <p className="text-sm text-gray-500 mt-2">Upload your own videos to use them here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {filteredItems.uploads.map(upload => (
                        <LibraryCard
                          key={upload.id}
                          item={upload}
                          type="upload"
                          isSelected={selectedItems.has(upload.id.toString())}
                          selectionOrder={selectedItems.get(upload.id.toString())}
                          isDownloading={downloadingVideos.has(String(upload.id))}
                          onSelect={config.selection?.enabled ? () => handleItemSelect(upload.id.toString()) : undefined}
                          onDownload={config.download?.enabled ? () => handleDownload(upload, 'upload') : undefined}
                          theme={config.theme}
                        />
                      ))}
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Footer - Selection Mode */}
        {config.selection?.enabled && (
          <div className="p-6 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {selectedItems.size > 0 && (
                  <button 
                    onClick={() => setSelectedItems(new Map())}
                    className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                {selectedItems.size > 0 && (
                  <button 
                    onClick={handleAddSelected}
                    disabled={isAdding}
                    className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: config.theme?.primaryColor || '#38f47cf9',
                      color: config.theme?.primaryColor?.startsWith('#38') ? 'black' : 'white'
                    }}
                  >
                    {isAdding ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Adding...</span>
                      </div>
                    ) : (
                      `Add Selected (${selectedItems.size})`
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}