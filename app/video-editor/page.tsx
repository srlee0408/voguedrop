'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import VideoPreview from '@/components/pages/video-editor/VideoPreview';
import Timeline from '@/components/pages/video-editor/Timeline';
import ControlBar from '@/components/pages/video-editor/ControlBar';
import VideoLibraryModal from '@/components/pages/video-editor/VideoLibraryModal';
import SoundLibraryModal from '@/components/pages/video-editor/SoundLibraryModal';

export default function VideoEditorPage() {
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);
  const [showSoundLibrary, setShowSoundLibrary] = useState(false);
  const [selectedSound, setSelectedSound] = useState('Epic Theme');
  const [timelineClips, setTimelineClips] = useState([
    { id: '1', duration: 280, thumbnails: 3 },
    { id: '2', duration: 200, thumbnails: 2 },
    { id: '3', duration: 160, thumbnails: 1 },
    { id: '4', duration: 240, thumbnails: 2 },
  ]);

  const handleAddClip = () => {
    setShowVideoLibrary(true);
  };

  const handleAddSound = () => {
    setShowSoundLibrary(true);
  };

  const handleAddToTimeline = () => {
    const newClip = {
      id: `clip-${Date.now()}`,
      duration: 160,
      thumbnails: 1,
    };
    setTimelineClips([...timelineClips, newClip]);
    setShowVideoLibrary(false);
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="flex flex-col h-screen">
        <Header />
        
        <div className="flex-1 flex">
          <VideoPreview />
        </div>

        <Timeline 
          clips={timelineClips}
          onAddClip={handleAddClip}
        />

        <ControlBar 
          selectedSound={selectedSound}
          onSelectSound={setSelectedSound}
          onAddSound={handleAddSound}
        />
      </div>

      {showVideoLibrary && (
        <VideoLibraryModal
          onClose={() => setShowVideoLibrary(false)}
          onAddToTimeline={handleAddToTimeline}
        />
      )}

      {showSoundLibrary && (
        <SoundLibraryModal
          onClose={() => setShowSoundLibrary(false)}
          onSelectSound={setSelectedSound}
        />
      )}
    </div>
  );
}