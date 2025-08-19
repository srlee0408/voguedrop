'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { LibraryVideo, LibraryProject, UserUploadedVideo, LibraryItem } from '@/types/video-editor';
import { useAuth } from '@/lib/auth/AuthContext';
import { extractVideoMetadata, extractVideoThumbnail } from '../_utils/video-metadata';

interface VideoLibraryModalProps {
  onClose: () => void;
  onAddToTimeline: (items: LibraryItem[]) => void;
}

// 모든 카드를 9:16 비율로 고정
const CARD_CONTAINER_CLASS = 'w-full aspect-[9/16]';

// 콘텐츠의 object-fit 스타일 결정
const getContentFitStyle = (aspectRatio?: string) => {
  switch(aspectRatio) {
    case '9:16':
      // 컨테이너와 동일한 비율 - 꽉 채움
      return 'object-cover';
    case '1:1':
      // 정사각형 콘텐츠 - 레터박스 처리
      return 'object-contain bg-black';
    case '16:9':
      // 가로형 콘텐츠 - 레터박스 처리
      return 'object-contain bg-black';
    default:
      return 'object-cover';
  }
};

export default function VideoLibraryModal({ onClose, onAddToTimeline }: VideoLibraryModalProps) {
  const [activeCategory, setActiveCategory] = useState<'clips' | 'projects' | 'uploads'>('clips');
  const [clipItems, setClipItems] = useState<LibraryVideo[]>([]);
  const [projectItems, setProjectItems] = useState<LibraryProject[]>([]);
  const [uploadItems, setUploadItems] = useState<UserUploadedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { user } = useAuth();

  // 카테고리별 개수
  const [counts, setCounts] = useState({ clips: 0, projects: 0, uploads: 0 });

  useEffect(() => {
    const fetchLibraryData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/canvas/library?limit=100');
        
        if (!response.ok) {
          throw new Error('Failed to fetch library data');
        }
        
        const data = await response.json();
        
        // 새로운 응답 형식 처리
        setClipItems(data.clips || data.videos || []);
        setProjectItems(data.projects || []);
        setUploadItems(data.uploads || []);
        setCounts(data.counts || { 
          clips: (data.clips || data.videos || []).length, 
          projects: (data.projects || []).length,
          uploads: (data.uploads || []).length
        });
      } catch (err) {
        console.error('Failed to fetch library data:', err);
        setError('Failed to load library. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchLibraryData();
    } else {
      setClipItems([]);
      setProjectItems([]);
      setUploadItems([]);
      setIsLoading(false);
    }
  }, [user]);

  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      if (newMap.has(itemId)) {
        // Deselect: remove from map and update order numbers
        const removedOrder = newMap.get(itemId)!;
        newMap.delete(itemId);
        // Update order numbers for items that were selected after this one
        newMap.forEach((order, id) => {
          if (order > removedOrder) {
            newMap.set(id, order - 1);
          }
        });
      } else {
        // Select: add to map if under limit
        if (newMap.size < 10) {
          newMap.set(itemId, newMap.size + 1);
        }
      }
      return newMap;
    });
  };

  const handleAddSelected = async () => {
    if (selectedItems.size === 0) return;
    
    setIsAdding(true);
    try {
      // Sort items by selection order
      const sortedItemIds = Array.from(selectedItems.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([itemId]) => itemId);
      
      const selectedLibraryItems: LibraryItem[] = [];
      
      // Map selected IDs to actual items based on active category
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
      
      await onAddToTimeline(selectedLibraryItems);
      onClose();
    } finally {
      setIsAdding(false);
    }
  };

  const clearSelection = () => {
    setSelectedItems(new Map());
  };

  // 카테고리 변경 시 선택 초기화
  const handleCategoryChange = (category: 'clips' | 'projects' | 'uploads') => {
    if (category !== activeCategory) {
      clearSelection();
      setActiveCategory(category);
    }
  };
  
  // 파일 업로드 핸들러
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 파일 크기 체크 (20MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(`File size exceeds 20MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      // 비디오 메타데이터 추출
      setUploadProgress(10);
      let metadata;
      try {
        metadata = await extractVideoMetadata(file);
        console.log('Extracted video metadata:', metadata);
      } catch (metadataError) {
        console.warn('Failed to extract video metadata:', metadataError);
        // 메타데이터 추출 실패해도 업로드는 계속 진행
        metadata = null;
      }
      
      // 썸네일 추출
      setUploadProgress(20);
      let thumbnailBlob: Blob | null = null;
      try {
        thumbnailBlob = await extractVideoThumbnail(file);
        console.log('Extracted thumbnail:', thumbnailBlob);
      } catch (thumbnailError) {
        console.warn('Failed to extract thumbnail:', thumbnailError);
        // 썸네일 추출 실패해도 업로드는 계속 진행
      }
      
      const formData = new FormData();
      formData.append('file', file);
      
      // 썸네일이 있으면 추가
      if (thumbnailBlob) {
        const thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' });
        formData.append('thumbnail', thumbnailFile);
      }
      
      // 메타데이터가 있으면 추가
      if (metadata) {
        formData.append('duration', metadata.duration.toString());
        formData.append('aspectRatio', metadata.aspectRatio);
        formData.append('width', metadata.width.toString());
        formData.append('height', metadata.height.toString());
      }
      
      // Upload progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const response = await fetch('/api/upload/video', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const data = await response.json();
      setUploadProgress(100);
      
      // Add to upload items
      if (data.video) {
        setUploadItems(prev => [data.video, ...prev]);
        setCounts(prev => ({ ...prev, uploads: prev.uploads + 1 }));
      }
      
      // Reset after success
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 500);
      
      // Reset file input
      event.target.value = '';
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload video');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const renderClipCard = (clip: LibraryVideo) => {
    const isSelected = selectedItems.has(clip.id);
    const selectionOrder = selectedItems.get(clip.id);
    
    // 콘텐츠 fit 스타일 결정
    const contentFitClass = getContentFitStyle(clip.aspect_ratio || '9:16');
    
    return (
      <div 
        key={clip.id}
        onClick={() => handleItemSelect(clip.id)}
        className={`${CARD_CONTAINER_CLASS} bg-gray-900 rounded-lg overflow-hidden cursor-pointer relative transition-all
          ${isSelected 
            ? 'ring-2 ring-[#38f47cf9] scale-[0.98]' 
            : 'hover:ring-2 hover:ring-[#38f47cf9]/50'}`}
      >
        <div className="relative h-full group">
          {/* Thumbnail or Video Preview */}
          {clip.input_image_url ? (
            <Image 
              src={clip.input_image_url} 
              alt="Video thumbnail" 
              className={`w-full h-full ${contentFitClass}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <i className="ri-video-line text-4xl text-gray-600"></i>
            </div>
          )}
          
          {/* Selection number indicator */}
          {isSelected && selectionOrder && (
            <div className="absolute top-2 right-2 w-8 h-8 bg-[#38f47cf9] rounded-full flex items-center justify-center text-black font-bold text-sm z-10">
              {selectionOrder}
            </div>
          )}
          
          {/* Hover 시 play/download 버튼 */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {clip.output_video_url && (
              <>
                <a 
                  href={clip.output_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <i className="ri-play-fill text-white"></i>
                </a>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Add download handler
                  }}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
                >
                  <i className="ri-download-line text-white"></i>
                </button>
              </>
            )}
          </div>
          
          {/* 즐겨찾기 버튼 */}
          {clip.is_favorite && (
            <div className="absolute top-2 right-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Add favorite toggle handler
                }}
                className="bg-black/60 p-1.5 rounded-full hover:bg-black/80 transition-colors"
              >
                <i className="ri-star-fill text-yellow-400 text-xl drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"></i>
              </button>
            </div>
          )}
          
          {/* Video info overlay - hover 시에만 표시 */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            {clip.selected_effects.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {clip.selected_effects.map((effect) => (
                  <span 
                    key={effect.id}
                    className="text-[10px] px-2 py-0.5 bg-black/50 rounded backdrop-blur-sm text-white"
                  >
                    {effect.name}
                  </span>
                ))}
              </div>
            )}
            <div className="text-xs text-gray-300">
              {new Date(clip.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectCard = (project: LibraryProject) => {
    const isSelected = selectedItems.has(project.id.toString());
    const selectionOrder = selectedItems.get(project.id.toString());
    
    // 콘텐츠 fit 스타일 결정
    const contentFitClass = getContentFitStyle(project.content_snapshot?.aspect_ratio || '16:9');
    
    return (
      <div 
        key={project.id}
        onClick={() => handleItemSelect(project.id.toString())}
        className={`${CARD_CONTAINER_CLASS} bg-gray-900 rounded-lg overflow-hidden cursor-pointer relative transition-all
          ${isSelected 
            ? 'ring-2 ring-[#38f47cf9] scale-[0.98]' 
            : 'hover:ring-2 hover:ring-[#38f47cf9]/50'}`}
      >
        <div className="relative h-full group">
          {/* Video Thumbnail - 첫 프레임 사용 */}
          {project.latest_video_url ? (
            <video 
              src={project.latest_video_url}
              className={`w-full h-full ${contentFitClass}`}
              muted
              playsInline
              preload="metadata"
              onError={(e) => {
                // 비디오 로드 실패 시 폴백
                const target = e.target as HTMLVideoElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <i className="ri-folder-line text-4xl text-gray-600"></i>
            </div>
          )}
          
          {/* Selection number indicator */}
          {isSelected && selectionOrder && (
            <div className="absolute top-2 right-2 w-8 h-8 bg-[#38f47cf9] rounded-full flex items-center justify-center text-black font-bold text-sm z-10">
              {selectionOrder}
            </div>
          )}
          
          {/* Hover 시 play/download 버튼 */}
          {project.latest_video_url && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <a 
                href={project.latest_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <i className="ri-play-fill text-white"></i>
              </a>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Add download handler for project
                }}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
              >
                <i className="ri-download-line text-white"></i>
              </button>
            </div>
          )}
          
          {/* Project info - 항상 표시 */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
            <h4 className="text-sm font-medium text-white truncate">
              {project.project_name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              {project.content_snapshot && (
                <span className="text-[10px] text-gray-400">
                  {project.content_snapshot.aspect_ratio}
                </span>
              )}
              {project.latest_render?.status && (
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  project.latest_render.status === 'completed' 
                    ? 'bg-green-500/20 text-green-400' 
                    : project.latest_render.status === 'processing'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {project.latest_render.status}
                </span>
              )}
              <span className="text-[10px] text-gray-400">
                {new Date(project.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUploadCard = (upload: UserUploadedVideo & { url?: string }) => {
    const isSelected = selectedItems.has(upload.id.toString());
    const selectionOrder = selectedItems.get(upload.id.toString());
    
    // 콘텐츠 fit 스타일 결정
    const contentFitClass = getContentFitStyle(upload.aspect_ratio || '16:9');
    
    return (
      <div 
        key={upload.id}
        onClick={() => handleItemSelect(upload.id.toString())}
        className={`${CARD_CONTAINER_CLASS} bg-gray-900 rounded-lg overflow-hidden cursor-pointer relative transition-all
          ${isSelected 
            ? 'ring-2 ring-[#38f47cf9] scale-[0.98]' 
            : 'hover:ring-2 hover:ring-[#38f47cf9]/50'}`}
      >
        <div className="relative h-full group">
          {/* Thumbnail 또는 Video Preview */}
          {upload.thumbnail_url ? (
            // 썸네일이 있으면 이미지로 표시
            <Image 
              src={upload.thumbnail_url} 
              alt={upload.file_name} 
              className={`w-full h-full ${contentFitClass}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : upload.url ? (
            // 썸네일이 없으면 비디오의 첫 프레임 표시
            <video 
              src={upload.url}
              className={`w-full h-full ${contentFitClass}`}
              muted
              playsInline
              preload="metadata"
              onError={(e) => {
                const target = e.target as HTMLVideoElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <i className="ri-upload-cloud-line text-4xl text-gray-600"></i>
            </div>
          )}
          
          {/* Selection number indicator */}
          {isSelected && selectionOrder && (
            <div className="absolute top-2 right-2 w-8 h-8 bg-[#38f47cf9] rounded-full flex items-center justify-center text-black font-bold text-sm z-10">
              {selectionOrder}
            </div>
          )}
          
          {/* Hover 시 play/download 버튼 */}
          {upload.url && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <a 
                href={upload.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <i className="ri-play-fill text-white"></i>
              </a>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Add download handler for upload
                }}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
              >
                <i className="ri-download-line text-white"></i>
              </button>
            </div>
          )}
          
          {/* Upload info - 항상 표시 */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
            <h4 className="text-sm font-medium text-white truncate">
              {upload.file_name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-gray-400">
                {(upload.file_size / (1024 * 1024)).toFixed(2)} MB
              </span>
              {upload.aspect_ratio && (
                <span className="text-[10px] text-gray-400">
                  {upload.aspect_ratio}
                </span>
              )}
              <span className="text-[10px] text-gray-400">
                {new Date(upload.uploaded_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[900px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-medium">Video Library</h2>
            {selectedItems.size > 0 && (
              <span className="text-sm text-gray-400">
                {selectedItems.size} selected (max 10)
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-lg"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-[180px] bg-gray-900 border-r border-gray-700 p-4">
            <div className="space-y-2">
              <button
                onClick={() => handleCategoryChange('clips')}
                className={`w-full px-4 py-3 rounded-lg text-left transition-colors flex items-center justify-between
                  ${activeCategory === 'clips' 
                    ? 'bg-[#38f47cf9]/20 text-[#38f47cf9]' 
                    : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">
                  <i className="ri-video-line text-lg"></i>
                  <span className="text-sm font-medium">Clips</span>
                </div>
                <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                  {counts.clips}
                </span>
              </button>
              
              <button
                onClick={() => handleCategoryChange('projects')}
                className={`w-full px-4 py-3 rounded-lg text-left transition-colors flex items-center justify-between
                  ${activeCategory === 'projects' 
                    ? 'bg-[#38f47cf9]/20 text-[#38f47cf9]' 
                    : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">
                  <i className="ri-folder-line text-lg"></i>
                  <span className="text-sm font-medium">Projects</span>
                </div>
                <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                  {counts.projects}
                </span>
              </button>
              
              <button
                onClick={() => handleCategoryChange('uploads')}
                className={`w-full px-4 py-3 rounded-lg text-left transition-colors flex items-center justify-between
                  ${activeCategory === 'uploads' 
                    ? 'bg-[#38f47cf9]/20 text-[#38f47cf9]' 
                    : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">
                  <i className="ri-upload-cloud-line text-lg"></i>
                  <span className="text-sm font-medium">Uploads</span>
                </div>
                <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                  {counts.uploads}
                </span>
              </button>
            </div>
            
            {/* Upload Button */}
            {activeCategory === 'uploads' && (
              <div className="mt-4">
                <button
                  onClick={() => document.getElementById('video-upload-input')?.click()}
                  disabled={isUploading}
                  className="w-full py-3 bg-[#38f47cf9] text-black rounded-lg hover:bg-[#38f47cf9]/80 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      <span>Uploading... {uploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-upload-2-line"></i>
                      <span>Upload Video</span>
                    </>
                  )}
                </button>
                {isUploading && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-[#38f47cf9] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                <input
                  id="video-upload-input"
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Max file size: 20MB
                </p>
              </div>
            )}
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-[#38f47cf9] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-400">Loading library...</span>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <i className="ri-error-warning-line text-4xl text-red-500 mb-4"></i>
                  <p className="text-gray-400">{error}</p>
                </div>
              </div>
            ) : (
              <>
                {activeCategory === 'clips' ? (
                  clipItems.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <i className="ri-video-line text-4xl text-gray-500 mb-4"></i>
                        <p className="text-gray-400">No clips in library yet</p>
                        <p className="text-sm text-gray-500 mt-2">Generate videos in Canvas to see them here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {clipItems.map(renderClipCard)}
                    </div>
                  )
                ) : activeCategory === 'projects' ? (
                  projectItems.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <i className="ri-folder-line text-4xl text-gray-500 mb-4"></i>
                        <p className="text-gray-400">No saved projects yet</p>
                        <p className="text-sm text-gray-500 mt-2">Save your video projects to see them here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {projectItems.map(renderProjectCard)}
                    </div>
                  )
                ) : activeCategory === 'uploads' ? (
                  uploadItems.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <i className="ri-upload-cloud-line text-4xl text-gray-500 mb-4"></i>
                        <p className="text-gray-400">No uploaded videos yet</p>
                        <p className="text-sm text-gray-500 mt-2">Upload your own videos to use them here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {uploadItems.map(renderUploadCard)}
                    </div>
                  )
                ) : null}
              </>
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {selectedItems.size > 0 && (
                <button 
                  onClick={clearSelection}
                  className="px-4 py-2 bg-gray-700 rounded-button hover:bg-gray-600 text-sm"
                >
                  Clear Selection
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 rounded-button hover:bg-gray-600"
              >
                Cancel
              </button>
              {selectedItems.size > 0 && (
                <button 
                  onClick={handleAddSelected}
                  disabled={isAdding}
                  className="px-4 py-2 bg-[#38f47cf9] rounded-button text-black font-medium hover:bg-[#38f47cf9]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdding ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
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
      </div>
    </div>
  );
}