'use client';

interface PreviewClip {
  id: string;
  thumbnail?: string;
  url?: string;
  duration: number;
  thumbnails: number;
}

interface VideoPreviewProps {
  clips: PreviewClip[];
  onRemoveClip?: (id: string) => void;
}

export default function VideoPreview({ clips, onRemoveClip }: VideoPreviewProps) {
  const mainClip = clips[0];
  const sideClips = clips.slice(1, 5);

  return (
    <div className="flex-1 px-4 bg-black">
      <div className="flex gap-3 justify-between">
        {mainClip && (
          <div className="bg-gray-800 rounded-lg overflow-hidden flex-1">
            <div className="relative">
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm font-medium">
                {mainClip.id}
              </div>
              <div
                className="aspect-[9/16] bg-cover bg-center h-[480px] w-full object-cover"
                style={{ backgroundImage: mainClip.thumbnail ? `url('${mainClip.thumbnail}')` : undefined }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Main</span>
                  <div className="flex gap-1">
                    {onRemoveClip && (
                      <button
                        className="w-6 h-6 flex items-center justify-center bg-white bg-opacity-20 rounded hover:bg-opacity-30"
                        onClick={() => onRemoveClip(mainClip.id)}
                      >
                        <i className="ri-delete-bin-line text-xs"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {sideClips.map((clip) => (
          <div key={clip.id} className="bg-gray-800 rounded-lg overflow-hidden w-1/5">
            <div className="relative">
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm font-medium">
                {clip.id}
              </div>
              <div
                className="aspect-[9/16] bg-cover bg-center h-[480px] w-full object-cover"
                style={{ backgroundImage: clip.thumbnail ? `url('${clip.thumbnail}')` : undefined }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Clip</span>
                  <div className="flex gap-1">
                    {onRemoveClip && (
                      <button
                        className="w-6 h-6 flex items-center justify-center bg-white bg-opacity-20 rounded hover:bg-opacity-30"
                        onClick={() => onRemoveClip(clip.id)}
                      >
                        <i className="ri-delete-bin-line text-xs"></i>
                      </button>
                    )}
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