'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import VideoPreview from './_components/VideoPreview';
import Timeline from './_components/Timeline';
import ControlBar from './_components/ControlBar';
import VideoLibraryModal from './_components/VideoLibraryModal';
import SoundLibraryModal from './_components/SoundLibraryModal';
import TextEditorModal from './_components/TextEditorModal';
import { TextClip, SoundClip, LibraryVideo } from '@/types/video-editor';

export default function VideoEditorPage() {
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);
  const [showSoundLibrary, setShowSoundLibrary] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [selectedSound, setSelectedSound] = useState('Epic Theme');
  const [editingTextClip, setEditingTextClip] = useState<TextClip | undefined>(undefined);
  const [timelineClips, setTimelineClips] = useState([
    { id: '1', duration: 280, thumbnails: 3 },
    { id: '2', duration: 200, thumbnails: 2 },
    { id: '3', duration: 160, thumbnails: 1 },
    { id: '4', duration: 240, thumbnails: 2 },
  ]);
  const [textClips, setTextClips] = useState<TextClip[]>([]);
  const [soundClips, setSoundClips] = useState<SoundClip[]>([]);

  const handleAddClip = () => {
    setShowVideoLibrary(true);
  };

  const handleAddSound = () => {
    setShowSoundLibrary(true);
  };

  const handleAddText = () => {
    setEditingTextClip(undefined);
    setShowTextEditor(true);
  };

  const handleAddToTimeline = (video: LibraryVideo) => {
    const newClip = {
      id: video.id || `clip-${Date.now()}`,
      duration: 160,
      thumbnails: 1,
      url: video.output_video_url,
      thumbnail: video.input_image_url,
    };
    setTimelineClips([...timelineClips, newClip]);
    setShowVideoLibrary(false);
  };

  const handleAddTextClip = (textData: Partial<TextClip>) => {
    if (editingTextClip) {
      setTextClips(textClips.map(clip => 
        clip.id === editingTextClip.id 
          ? { ...clip, ...textData } 
          : clip
      ));
    } else {
      const newTextClip: TextClip = {
        id: `text-${Date.now()}`,
        content: textData.content || '',
        duration: textData.duration || 200,
        position: textData.position || 0,
        style: textData.style || {
          fontSize: 24,
          fontFamily: 'default',
          color: '#FFFFFF',
          alignment: 'center',
        },
        effect: textData.effect,
      };
      setTextClips([...textClips, newTextClip]);
    }
    setShowTextEditor(false);
    setEditingTextClip(undefined);
  };

  const handleEditTextClip = (clip: TextClip) => {
    setEditingTextClip(clip);
    setShowTextEditor(true);
  };

  const handleDeleteTextClip = (id: string) => {
    setTextClips(textClips.filter(clip => clip.id !== id));
  };

  const handleResizeTextClip = (id: string, newDuration: number) => {
    setTextClips(textClips.map(clip => 
      clip.id === id ? { ...clip, duration: newDuration } : clip
    ));
  };

  const handleAddSoundClip = (soundData: Partial<SoundClip>) => {
    const newSoundClip: SoundClip = {
      id: `sound-${Date.now()}`,
      name: soundData.name || 'New Sound',
      duration: soundData.duration || 300,
      position: soundData.position || 0,
      volume: soundData.volume || 100,
      url: soundData.url,
    };
    setSoundClips([...soundClips, newSoundClip]);
    setShowSoundLibrary(false);
  };

  const handleEditSoundClip = (clip: SoundClip) => {
    // TODO: Implement sound editing modal
    console.log('Edit sound clip:', clip);
  };

  const handleDeleteSoundClip = (id: string) => {
    setSoundClips(soundClips.filter(clip => clip.id !== id));
  };

  const handleResizeSoundClip = (id: string, newDuration: number) => {
    setSoundClips(soundClips.map(clip => 
      clip.id === id ? { ...clip, duration: newDuration } : clip
    ));
  };

  const handleReorderVideoClips = (newClips: typeof timelineClips) => {
    setTimelineClips(newClips);
  };

  const handleReorderTextClips = (newClips: TextClip[]) => {
    setTextClips(newClips);
  };

  const handleReorderSoundClips = (newClips: SoundClip[]) => {
    setSoundClips(newClips);
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
          textClips={textClips}
          soundClips={soundClips}
          onAddClip={handleAddClip}
          onAddText={handleAddText}
          onAddSound={handleAddSound}
          onEditTextClip={handleEditTextClip}
          onEditSoundClip={handleEditSoundClip}
          onDeleteTextClip={handleDeleteTextClip}
          onDeleteSoundClip={handleDeleteSoundClip}
          onResizeTextClip={handleResizeTextClip}
          onResizeSoundClip={handleResizeSoundClip}
          onReorderVideoClips={handleReorderVideoClips}
          onReorderTextClips={handleReorderTextClips}
          onReorderSoundClips={handleReorderSoundClips}
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
          onSelectSound={(sound) => {
            setSelectedSound(sound);
            handleAddSoundClip({ name: sound, duration: 300, volume: 100 });
          }}
        />
      )}

      {showTextEditor && (
        <TextEditorModal
          isOpen={showTextEditor}
          onClose={() => {
            setShowTextEditor(false);
            setEditingTextClip(undefined);
          }}
          onAddText={handleAddTextClip}
          editingClip={editingTextClip}
        />
      )}
    </div>
  );
}