'use client';

import { useState } from 'react';

interface SoundLibraryModalProps {
  onClose: () => void;
  onSelectSound: (sound: string) => void;
}

const soundCategories = ['Cinematic', 'Upbeat', 'Ambient', 'Sound Effects'];

const sounds = {
  Cinematic: [
    { id: '1', name: 'Epic Orchestra', duration: '3:24' },
    { id: '2', name: 'Dramatic Tension', duration: '2:45' },
    { id: '3', name: 'Heroic Theme', duration: '4:10' },
  ],
  Upbeat: [
    { id: '4', name: 'Happy Energy', duration: '2:30' },
    { id: '5', name: 'Dance Party', duration: '3:15' },
  ],
  Ambient: [
    { id: '6', name: 'Peaceful Waves', duration: '5:00' },
    { id: '7', name: 'Forest Sounds', duration: '4:30' },
  ],
  'Sound Effects': [
    { id: '8', name: 'Whoosh', duration: '0:03' },
    { id: '9', name: 'Impact', duration: '0:02' },
  ],
};

export default function SoundLibraryModal({ onClose, onSelectSound }: SoundLibraryModalProps) {
  const [activeCategory, setActiveCategory] = useState('Cinematic');
  const [playingSound, setPlayingSound] = useState<string | null>(null);

  const handlePlayPause = (soundId: string) => {
    setPlayingSound(playingSound === soundId ? null : soundId);
  };

  const handleAddToTimeline = (soundName: string) => {
    onSelectSound(soundName);
    onClose();
  };

  const currentSounds = sounds[activeCategory as keyof typeof sounds] || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[800px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-medium">Sound Library</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-lg"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Categories</h3>
                <div className="flex gap-2">
                  {soundCategories.map((category) => (
                    <button 
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        activeCategory === category 
                          ? 'bg-primary text-black' 
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {currentSounds.map((sound) => (
                  <div 
                    key={sound.id}
                    className="flex items-center gap-4 p-3 hover:bg-gray-700 rounded cursor-pointer group"
                  >
                    <button 
                      onClick={() => handlePlayPause(sound.id)}
                      className="w-8 h-8 flex items-center justify-center bg-gray-900 rounded-full hover:bg-gray-800"
                    >
                      <i className={playingSound === sound.id ? 'ri-pause-fill' : 'ri-play-fill'}></i>
                    </button>
                    <div className="flex-1">
                      <div className="font-medium">{sound.name}</div>
                      <div className="text-sm text-gray-400">{activeCategory} • {sound.duration}</div>
                    </div>
                    <button 
                      onClick={() => handleAddToTimeline(sound.name)}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-primary rounded-button text-sm hover:bg-primary/80 text-black"
                    >
                      Add to Timeline
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-1">
              <div className="mb-4">
                <h3 className="font-medium mb-2">Upload Audio</h3>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                  <i className="ri-upload-cloud-line text-3xl text-gray-400 mb-2"></i>
                  <div className="text-sm text-gray-400">Drag and drop or click to upload</div>
                  <input type="file" accept="audio/*" className="hidden" id="audio-upload" />
                  <button 
                    onClick={() => document.getElementById('audio-upload')?.click()}
                    className="mt-4 px-4 py-2 bg-gray-700 rounded-button text-sm hover:bg-gray-600"
                  >
                    Browse Files
                  </button>
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Recently Uploaded</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded">
                    <i className="ri-music-2-line"></i>
                    <div className="text-sm">custom_music.mp3</div>
                  </div>
                </div>
              </div>
            </div>
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
            <button className="px-4 py-2 bg-primary rounded-button hover:bg-primary/90 text-black">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}