'use client';

import Image from 'next/image';

interface VideoLibraryModalProps {
  onClose: () => void;
  onAddToTimeline: (videoId: string) => void;
}

const libraryVideos = [
  {
    id: 'lib1',
    imageUrl: 'https://readdy.ai/api/search-image?query=high%20fashion%20editorial%20photography%20with%20elegant%20model%20wearing%20avant-garde%20designer%20outfit%20in%20minimalist%20studio%20setting%2C%20dramatic%20lighting%2C%20professional%20fashion%20photography%20with%20clean%20background%2C%20luxury%20fashion%20lookbook%20style&width=270&height=480&seq=fashion1&orientation=portrait',
  },
  {
    id: 'lib2',
    imageUrl: 'https://readdy.ai/api/search-image?query=contemporary%20fashion%20editorial%20with%20model%20in%20modern%20streetwear%2C%20urban%20setting%20with%20soft%20natural%20lighting%2C%20fashion%20lookbook%20photography%20with%20architectural%20elements%2C%20lifestyle%20fashion%20photography&width=240&height=420&seq=fashion2&orientation=portrait',
  },
  {
    id: 'lib3',
    imageUrl: 'https://readdy.ai/api/search-image?query=high-end%20fashion%20editorial%20with%20model%20in%20luxury%20evening%20wear%2C%20dramatic%20studio%20lighting%20with%20dark%20background%2C%20professional%20fashion%20photography%20with%20cinematic%20mood%2C%20elegant%20fashion%20lookbook%20style&width=240&height=420&seq=fashion3&orientation=portrait',
  },
  {
    id: 'lib4',
    imageUrl: 'https://readdy.ai/api/search-image?query=avant-garde%20fashion%20editorial%20with%20model%20in%20artistic%20designer%20outfit%2C%20minimalist%20studio%20setting%20with%20geometric%20shadows%2C%20high-end%20fashion%20photography%20with%20artistic%20composition%2C%20modern%20fashion%20lookbook%20style&width=240&height=420&seq=fashion4&orientation=portrait',
  },
  {
    id: 'lib5',
    imageUrl: 'https://readdy.ai/api/search-image?query=luxury%20fashion%20editorial%20with%20model%20in%20couture%20dress%2C%20dramatic%20studio%20lighting%20with%20fog%20effects%2C%20professional%20fashion%20photography%20with%20artistic%20flair%2C%20premium%20fashion%20lookbook%20style&width=240&height=420&seq=fashion5&orientation=portrait',
  },
];

export default function VideoLibraryModal({ onClose, onAddToTimeline }: VideoLibraryModalProps) {
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
          <div className="grid grid-cols-3 gap-4">
            {libraryVideos.map((video) => (
              <div 
                key={video.id}
                className="aspect-[7/8] bg-gray-900 rounded-lg overflow-hidden group cursor-pointer hover:ring-2 hover:ring-[#38f47cf9]"
              >
                <div className="relative h-full">
                  <Image 
                    src={video.imageUrl} 
                    alt="Video thumbnail" 
                    className="w-full h-full object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                    <button 
                      onClick={() => onAddToTimeline(video.id)}
                      className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-[#38f47cf9] rounded-button text-black font-medium"
                    >
                      Add to Timeline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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