'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { X, Info, Loader2, Video, Folder, Upload, Heart } from 'lucide-react';
import { LibraryModalBaseProps, LibraryCategory } from '@/shared/types/library-modal';
import { LibraryVideo, LibraryProject, UserUploadedVideo, LibraryItem } from '@/shared/types/video-editor';
import { useLibraryData } from './hooks/useLibraryData';
import { useLibraryFavoritesInfinite, useLibraryRegularInfinite } from './hooks/useLibraryInfiniteQuery';
import { LibraryCard } from './components/LibraryCard';
import { LibraryCardActions } from './components/LibraryCardActions';
import { LibrarySidebar } from './components/LibrarySidebar';
import { LibraryUpload } from './components/LibraryUpload';
import { VirtualizedLibrarySection } from './components/VirtualizedLibrarySection';
import { getAllClips } from './hooks/useLibraryInfiniteQuery';

export function LibraryModalBase({ isOpen, onClose, config }: LibraryModalBaseProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<LibraryCategory>('favorites');
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [isAdding, setIsAdding] = useState(false);
  const [downloadingVideos, setDownloadingVideos] = useState<Set<string>>(new Set());
  
  const { 
    projectItems, 
    uploadItems, 
    updateUploadItems,
    updateCounts
  } = useLibraryData(isOpen, false); // Skip clips loading

  // 즐겨찾기 클립 데이터 (캐싱 최적화 적용)
  const favoritesQuery = useLibraryFavoritesInfinite(
    isOpen,
    20,
    false, // prefetch 비활성화로 불필요한 로딩 방지
    {
      staleTime: 2 * 60 * 1000,    // 2분간 fresh - 즐겨찾기는 자주 변경됨
      gcTime: 10 * 60 * 1000,      // 10분간 메모리 유지
      refetchOnWindowFocus: false, // 윈도우 포커스 시 리페치 방지
      refetchOnMount: false,       // 마운트 시 리페치 방지
    }
  );

  // 일반 클립 데이터 (모든 페이지에서 실시간 반영)
  const regularQuery = useLibraryRegularInfinite(
    isOpen,
    50,
    false,
    {
      staleTime: 0,                 // 모든 페이지에서 즉시 반영 (실시간 업데이트)
      gcTime: 15 * 60 * 1000,       // 15분간 메모리 유지
      refetchOnWindowFocus: false,  // 윈도우 포커스 시 리페치 방지
      refetchOnMount: false,        // 마운트 시 리페치 방지 (gcTime으로 성능 보장)
    }
  );

  // Canvas에서 클립 생성 완료 시 실시간 반영
  useEffect(() => {
    if (!isOpen) return;

    const handleClipCompleted = (event: CustomEvent) => {
      console.log('🎬 New clip completed:', event.detail);
      
      // staleTime 무시하고 강제 새로고침
      queryClient.invalidateQueries({
        queryKey: ['library-infinite', 'regular'],
        refetchType: 'all' // 활성/비활성 상태와 관계없이 모든 쿼리 refetch
      });
      
      // favorites도 업데이트 (새 클립이 즐겨찾기일 수 있음)
      queryClient.invalidateQueries({
        queryKey: ['library-infinite', 'favorites'],
        refetchType: 'all' // 활성/비활성 상태와 관계없이 모든 쿼리 refetch
      });
      
      console.log('📱 Library queries invalidated for real-time update');
    };

    // Canvas 클립 완료 이벤트 리스너 등록
    window.addEventListener('canvas-clip-completed', handleClipCompleted as EventListener);
    
    return () => {
      window.removeEventListener('canvas-clip-completed', handleClipCompleted as EventListener);
    };
  }, [isOpen, queryClient]);

  // 데이터 추출 (기존 인터페이스 호환성 유지)
  const favoriteClips = getAllClips(favoritesQuery.data?.pages || []);
  const regularClips = getAllClips(regularQuery.data?.pages || []);
  
  const favoritesLoading = favoritesQuery.isLoading;
  const favoritesError = favoritesQuery.error;
  const favoritesHasNext = favoritesQuery.hasNextPage;
  const favoritesFetching = favoritesQuery.isFetchingNextPage;
  const fetchMoreFavorites = favoritesQuery.fetchNextPage;
  
  const regularLoading = regularQuery.isLoading;
  const regularError = regularQuery.error;
  const regularHasNext = regularQuery.hasNextPage;
  const regularFetching = regularQuery.isFetchingNextPage;
  const fetchMoreRegular = regularQuery.fetchNextPage;

  // 타입 안전성을 위한 명시적 타입 캐스팅
  const safeError = (error: unknown): Error | null => {
    if (error instanceof Error) return error;
    if (error && typeof error === 'object' && 'message' in error) {
      return new Error(String((error as { message: unknown }).message));
    }
    return error ? new Error(String(error)) : null;
  };

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
          // 즐겨찾기와 일반 클립에서 모두 검색
          const clip = favoriteClips.find(c => c.id === id) || regularClips.find(c => c.id === id);
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
  }, [config.selection, selectedItems, activeCategory, favoriteClips, regularClips, projectItems, uploadItems, onClose]);

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
    // 프로젝트 필터 적용 - 비디오가 있는 프로젝트만 표시
    let filteredProjects = projectItems;
    if (config.projectFilter?.enabled && config.projectFilter.requireVideo) {
      filteredProjects = filteredProjects.filter(project => 
        project.latest_video_url && project.latest_video_url.trim() !== ''
      );
    }

    return { 
      favorites: favoriteClips, 
      regular: regularClips, 
      projects: filteredProjects, 
      uploads: uploadItems 
    };
  }, [favoriteClips, regularClips, projectItems, uploadItems, config.projectFilter]);

  // 업로드 완료 핸들러
  const handleUploadComplete = useCallback((video: UserUploadedVideo) => {
    updateUploadItems(video);
    updateCounts('uploads', 1);
  }, [updateUploadItems, updateCounts]);

  // 프로젝트 네비게이션 핸들러
  const handleProjectNavigate = useCallback((project: LibraryProject) => {
    // openProject가 활성화되지 않았으면 동작하지 않음
    if (!config.openProject?.enabled) return;
    
    // openProject에 onProjectNavigate가 있으면 project.id를 전달
    if (config.openProject.onProjectNavigate) {
      config.openProject.onProjectNavigate(project.id); // project.id 사용
      onClose();
    } 
    // 레거시 지원: onProjectSwitch가 있으면 사용
    else if (pathname === '/video-editor' && config.onProjectSwitch) {
      config.onProjectSwitch(project.id); // project.id 사용
      onClose();
    }
    // window.location.href 제거 - 항상 콜백을 통해서만 처리
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, onClose, config.onProjectSwitch, config.openProject]);

  // 필터링된 카운트 계산 (즐겨찾기는 실제 is_favorite 상태를 반영)
  const filteredCounts = useMemo(() => {
    // 즐겨찾기 카운트는 모든 클립에서 is_favorite=true인 개수를 직접 계산
    const allClips = [...filteredItems.favorites, ...filteredItems.regular];
    const uniqueClips = allClips.filter((clip, index, arr) => 
      arr.findIndex(c => c.id === clip.id) === index
    );
    const favoritesCount = uniqueClips.filter(clip => clip.is_favorite).length;
    
    return {
      favorites: favoritesCount,
      clips: filteredItems.regular.length,
      projects: filteredItems.projects.length,
      uploads: filteredItems.uploads.length
    };
  }, [filteredItems]);

  // 즐겨찾기 토글 핸들러
  const handleFavoriteToggle = useCallback((videoId: string) => {
    if (config.favorites?.onToggle) {
      config.favorites.onToggle(videoId);
      // React Query의 낙관적 업데이트가 즉시 반영하므로 refetch 불필요
    }
  }, [config.favorites]);

  // 클립 다운로드 핸들러
  const handleClipDownload = useCallback((clip: LibraryVideo) => {
    handleDownload(clip, 'clip');
  }, [handleDownload]);

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
            counts={filteredCounts}
            uploadSection={activeCategory === 'uploads' ? (
              <LibraryUpload 
                onUploadComplete={handleUploadComplete}
              />
            ) : undefined}
            theme={config.theme}
          />
          
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeCategory === 'favorites' && (
              <VirtualizedLibrarySection
                title="Favorites"
                icon={Heart}
                items={filteredItems.favorites}
                loading={favoritesLoading}
                error={safeError(favoritesError)}
                hasNextPage={favoritesHasNext}
                isFetchingNextPage={favoritesFetching}
                onFetchNextPage={async () => { await fetchMoreFavorites(); }}
                config={config}
                selectedItems={selectedItems}
                downloadingVideos={downloadingVideos}
                onItemSelect={handleItemSelect}
                onFavoriteToggle={handleFavoriteToggle}
                onDownload={handleClipDownload}
                emptyMessage="No favorite clips found"
                emptyDescription="Add clips to favorites to see them here"
                showFixedLoader={false}
              />
            )}
            
            {activeCategory === 'clips' && (
              <VirtualizedLibrarySection
                title="Clips"
                icon={Video}
                items={filteredItems.regular}
                loading={regularLoading}
                error={safeError(regularError)}
                hasNextPage={regularHasNext}
                isFetchingNextPage={regularFetching}
                onFetchNextPage={async () => { await fetchMoreRegular(); }}
                config={config}
                selectedItems={selectedItems}
                downloadingVideos={downloadingVideos}
                onItemSelect={handleItemSelect}
                onFavoriteToggle={handleFavoriteToggle}
                onDownload={handleClipDownload}
                emptyMessage="No clips found"
                emptyDescription="Generate videos in Canvas to see them here"
                showFixedLoader={false}
              />
            )}
            
            {activeCategory === 'projects' && (
              filteredItems.projects.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <Folder className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">
                      {config.projectFilter?.enabled && config.projectFilter.requireVideo
                        ? config.projectFilter.emptyMessage || "No exported projects found"
                        : "No projects found"}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      {config.projectFilter?.enabled && config.projectFilter.requireVideo
                        ? "Only projects with exported videos are shown"
                        : "Save your video projects to see them here"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {filteredItems.projects.map((project, index) => {
                    const isSelected = selectedItems.has(project.id.toString());
                    const selectionOrder = selectedItems.get(project.id.toString());
                    const selectionColor = config.theme?.selectionColor || '#38f47cf9';
                    
                    return (
                      <div 
                        key={project.id} 
                        className={`flex flex-col rounded-lg overflow-hidden transition-all
                          ${isSelected 
                            ? `ring-2 scale-[0.98]` 
                            : config.selection?.enabled ? 'hover:ring-2 hover:ring-opacity-50' : ''}`}
                        style={{
                          '--tw-ring-color': isSelected ? selectionColor : `${selectionColor}80`,
                        } as React.CSSProperties}
                      >
                        <LibraryCard
                          item={project}
                          type="project"
                          isSelected={isSelected}
                          selectionOrder={selectionOrder}
                          isCurrentProject={config.currentProjectName === project.project_name}
                          priority={index < 4} // 상위 4개 프로젝트 우선 로딩
                          onSelect={config.selection?.enabled ? () => handleItemSelect(project.id.toString()) : undefined}
                          theme={config.theme}
                        />
                        <LibraryCardActions
                          item={project}
                          type="project"
                          isDownloading={downloadingVideos.has(String(project.id))}
                          isCurrentProject={config.currentProjectName === project.project_name}
                          onDownload={config.download?.enabled ? () => handleDownload(project, 'project') : undefined}
                          onProjectNavigate={config.openProject?.enabled ? handleProjectNavigate : undefined}
                          theme={config.theme}
                        />
                      </div>
                    );
                  })}
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
                  {filteredItems.uploads.map((upload, index) => {
                    const isSelected = selectedItems.has(upload.id.toString());
                    const selectionOrder = selectedItems.get(upload.id.toString());
                    const selectionColor = config.theme?.selectionColor || '#38f47cf9';
                    
                    return (
                      <div 
                        key={upload.id} 
                        className={`flex flex-col rounded-lg overflow-hidden transition-all
                          ${isSelected 
                            ? `ring-2 scale-[0.98]` 
                            : config.selection?.enabled ? 'hover:ring-2 hover:ring-opacity-50' : ''}`}
                        style={{
                          '--tw-ring-color': isSelected ? selectionColor : `${selectionColor}80`,
                        } as React.CSSProperties}
                      >
                        <LibraryCard
                          item={upload}
                          type="upload"
                          isSelected={isSelected}
                          selectionOrder={selectionOrder}
                          priority={index < 4} // 상위 4개 업로드 우선 로딩
                          onSelect={config.selection?.enabled ? () => handleItemSelect(upload.id.toString()) : undefined}
                          theme={config.theme}
                        />
                        <LibraryCardActions
                          item={upload}
                          type="upload"
                          isDownloading={downloadingVideos.has(String(upload.id))}
                          onDownload={config.download?.enabled ? () => handleDownload(upload, 'upload') : undefined}
                          theme={config.theme}
                        />
                      </div>
                    );
                  })}
                </div>
              )
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