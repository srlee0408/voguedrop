'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { LibraryVideo } from '@/types/video-editor';
import { useAuth } from '@/lib/auth/AuthContext';

interface VideoLibraryModalProps {
  onClose: () => void;
  onAddToTimeline: (video: LibraryVideo) => void;
}

export default function VideoLibraryModal({ onClose, onAddToTimeline }: VideoLibraryModalProps) {
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingVideoId, setAddingVideoId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/canvas/library?limit=100');
        
        if (!response.ok) {
          throw new Error('Failed to fetch videos');
        }
        
        const data = await response.json();
        setLibraryVideos(data.videos || []);
      } catch (err) {
        console.error('Failed to fetch library videos:', err);
        setError('Failed to load videos. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchVideos();
    } else {
      setLibraryVideos([]);
      setIsLoading(false);
    }
  }, [user]);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[800px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-medium">Video Library</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-lg"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#38f47cf9] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-400">Loading videos...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <i className="ri-error-warning-line text-4xl text-red-500 mb-4"></i>
                <p className="text-gray-400">{error}</p>
              </div>
            </div>
          ) : libraryVideos.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <i className="ri-video-line text-4xl text-gray-500 mb-4"></i>
                <p className="text-gray-400">No videos in library yet</p>
                <p className="text-sm text-gray-500 mt-2">Generate videos in Canvas to see them here</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {libraryVideos.map((video) => (
                <div 
                  key={video.id}
                  className="aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden group cursor-pointer hover:ring-2 hover:ring-[#38f47cf9] relative"
                >
                  <div className="relative h-full">
                    {/* Thumbnail or Video Preview */}
                    {video.input_image_url ? (
                      <Image 
                        src={video.input_image_url} 
                        alt="Video thumbnail" 
                        className="w-full h-full object-cover"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <i className="ri-video-line text-4xl text-gray-600"></i>
                      </div>
                    )}
                    
                    {/* Overlay with video info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        {/* Effects */}
                        {video.selected_effects.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {video.selected_effects.map((effect) => (
                              <span 
                                key={effect.id}
                                className="text-[10px] px-2 py-1 bg-black/50 rounded backdrop-blur-sm"
                              >
                                {effect.name}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Date */}
                        <div className="text-xs text-gray-400 mb-2">
                          {new Date(video.created_at).toLocaleDateString()}
                        </div>
                        
                        {/* Add button */}
                        <button 
                          onClick={async () => {
                            setAddingVideoId(video.id);
                            await onAddToTimeline(video);
                            setAddingVideoId(null);
                          }}
                          disabled={addingVideoId === video.id}
                          className="w-full px-3 py-2 bg-[#38f47cf9] rounded-button text-black text-sm font-medium hover:bg-[#38f47cf9]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {addingVideoId === video.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                              <span>Adding...</span>
                            </div>
                          ) : (
                            'Add to Timeline'
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Favorite indicator */}
                    {video.is_favorite && (
                      <div className="absolute top-2 right-2">
                        <i className="ri-star-fill text-yellow-500"></i>
                      </div>
                    )}
                    
                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <i className="ri-play-fill text-white text-xl ml-1"></i>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-700">
          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 rounded-button hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}