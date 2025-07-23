'use client';

const videos = [
  {
    id: '1',
    timeRange: '00:00 - 02:00',
    imageUrl: 'https://readdy.ai/api/search-image?query=high%20fashion%20editorial%20photography%20with%20elegant%20model%20wearing%20avant-garde%20designer%20outfit%20in%20minimalist%20studio%20setting%2C%20dramatic%20lighting%2C%20professional%20fashion%20photography%20with%20clean%20background%2C%20luxury%20fashion%20lookbook%20style&width=270&height=480&seq=fashion1&orientation=portrait',
    isMain: true,
  },
  {
    id: '2',
    timeRange: '02:00 - 04:00',
    imageUrl: 'https://readdy.ai/api/search-image?query=contemporary%20fashion%20editorial%20with%20model%20in%20modern%20streetwear%2C%20urban%20setting%20with%20soft%20natural%20lighting%2C%20fashion%20lookbook%20photography%20with%20architectural%20elements%2C%20lifestyle%20fashion%20photography&width=270&height=480&seq=fashion2&orientation=portrait',
  },
  {
    id: '3',
    timeRange: '04:00 - 06:00',
    imageUrl: 'https://readdy.ai/api/search-image?query=high-end%20fashion%20editorial%20with%20model%20in%20luxury%20evening%20wear%2C%20dramatic%20studio%20lighting%20with%20dark%20background%2C%20professional%20fashion%20photography%20with%20cinematic%20mood%2C%20elegant%20fashion%20lookbook%20style&width=270&height=480&seq=fashion3&orientation=portrait',
  },
  {
    id: '4',
    timeRange: '06:00 - 08:00',
    imageUrl: 'https://readdy.ai/api/search-image?query=avant-garde%20fashion%20editorial%20with%20model%20in%20artistic%20designer%20outfit%2C%20minimalist%20studio%20setting%20with%20geometric%20shadows%2C%20high-end%20fashion%20photography%20with%20artistic%20composition%2C%20modern%20fashion%20lookbook%20style&width=270&height=480&seq=fashion4&orientation=portrait',
  },
  {
    id: '5',
    timeRange: '08:00 - 10:00',
    imageUrl: 'https://readdy.ai/api/search-image?query=luxury%20fashion%20editorial%20with%20model%20in%20couture%20dress%2C%20dramatic%20studio%20lighting%20with%20fog%20effects%2C%20professional%20fashion%20photography%20with%20artistic%20flair%2C%20premium%20fashion%20lookbook%20style&width=270&height=480&seq=fashion5&orientation=portrait',
  },
];

export default function VideoPreview() {
  return (
    <div className="flex-1 px-4 bg-black">
      <div className="flex gap-3 justify-between">
        {videos.map((video) => (
          <div 
            key={video.id} 
            className={`bg-gray-800 rounded-lg overflow-hidden ${video.isMain ? 'flex-1' : 'w-1/5'}`}
          >
            <div className="relative">
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm font-medium">
                {video.id}
              </div>
              <div 
                className="aspect-[9/16] bg-cover bg-center h-[480px] w-full object-cover" 
                style={{ backgroundImage: `url('${video.imageUrl}')` }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{video.timeRange}</span>
                  <div className="flex gap-1">
                    <button className="w-6 h-6 flex items-center justify-center bg-white bg-opacity-20 rounded hover:bg-opacity-30">
                      <i className="ri-delete-bin-line text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}