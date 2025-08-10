'use client';

import { useState, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface SoundLibraryModalProps {
  onClose: () => void;
  onSelectSounds: (sounds: Array<{ name: string; url: string; duration: number }>) => void;
  onCreateVideo?: () => void;
}

interface UploadedAudio {
  id: string;
  name: string;
  url: string;
  duration: number;
  size: number;
}

export default function SoundLibraryModal({ onClose, onSelectSounds, onCreateVideo }: SoundLibraryModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'preset' | 'upload'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [uploadedAudios, setUploadedAudios] = useState<UploadedAudio[]>([]);
  const [selectedAudioIds, setSelectedAudioIds] = useState<Set<string>>(new Set());
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 프리셋 음악 옵션들
  const presetSounds = [
    { key: 'epicTheme', label: t('videoEditor.controls.soundOptions.epicTheme'), duration: 180 },
    { key: 'dramatic', label: t('videoEditor.controls.soundOptions.dramatic'), duration: 120 },
    { key: 'ambient', label: t('videoEditor.controls.soundOptions.ambient'), duration: 240 },
    { key: 'sfx', label: t('videoEditor.controls.soundOptions.sfx'), duration: 60 },
  ];

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio file'));
      });
      
      audio.src = url;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAudioIds: string[] = [];
    
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('audio/')) {
          alert(`${file.name} is not an audio file.`);
          continue;
        }

        const duration = await getAudioDuration(file);
        const url = URL.createObjectURL(file);
        
        const newAudio: UploadedAudio = {
          id: `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          url: url,
          duration: duration,
          size: file.size,
        };
        
        setUploadedAudios(prev => [...prev, newAudio]);
        newAudioIds.push(newAudio.id);
      }
      
      // 새로 업로드된 파일들을 자동으로 선택
      setSelectedAudioIds(prev => {
        const newSet = new Set(prev);
        newAudioIds.forEach(id => newSet.add(id));
        return newSet;
      });
    } catch (error) {
      console.error('Error uploading audio:', error);
      alert('Error uploading audio file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    const input = fileInputRef.current;
    if (input) {
      const dataTransfer = new DataTransfer();
      for (const file of Array.from(files)) {
        dataTransfer.items.add(file);
      }
      input.files = dataTransfer.files;
      
      const changeEvent = new Event('change', { bubbles: true });
      input.dispatchEvent(changeEvent);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePlayPause = (audio: UploadedAudio) => {
    if (playingAudioId === audio.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const newAudio = new Audio(audio.url);
      newAudio.play();
      audioRef.current = newAudio;
      setPlayingAudioId(audio.id);
      
      newAudio.addEventListener('ended', () => {
        setPlayingAudioId(null);
        audioRef.current = null;
      });
    }
  };

  const handleToggleSelect = (audioId: string) => {
    setSelectedAudioIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(audioId)) {
        newSet.delete(audioId);
      } else {
        newSet.add(audioId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedAudioIds.size === uploadedAudios.length) {
      setSelectedAudioIds(new Set());
    } else {
      setSelectedAudioIds(new Set(uploadedAudios.map(a => a.id)));
    }
  };

  const handleAddSelectedToTimeline = () => {
    if (activeTab === 'preset' && selectedPreset) {
      const preset = presetSounds.find(s => s.key === selectedPreset);
      if (preset) {
        onSelectSounds([{
          name: preset.label,
          url: '', // 프리셋 음악은 URL이 아닌 키로 처리
          duration: preset.duration,
        }]);
        onClose();
      }
    } else if (activeTab === 'upload') {
      const selectedAudios = uploadedAudios
        .filter(audio => selectedAudioIds.has(audio.id))
        .map(audio => ({
          name: audio.name,
          url: audio.url,
          duration: audio.duration,
        }));
      
      if (selectedAudios.length > 0) {
        onSelectSounds(selectedAudios);
        onClose();
      }
    }
  };

  const handleRemoveAudio = (audioId: string) => {
    const audio = uploadedAudios.find(a => a.id === audioId);
    if (audio) {
      URL.revokeObjectURL(audio.url);
      setUploadedAudios(prev => prev.filter(a => a.id !== audioId));
      setSelectedAudioIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(audioId);
        return newSet;
      });
      
      if (playingAudioId === audioId && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setPlayingAudioId(null);
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    const mb = kb / 1024;
    return mb.toFixed(1) + ' MB';
  };

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
          {/* 탭 선택 */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('preset')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'preset' 
                  ? 'bg-primary text-black' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Preset Music
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'upload' 
                  ? 'bg-primary text-black' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Upload Audio
            </button>
          </div>
          
          {activeTab === 'preset' ? (
            /* 프리셋 음악 선택 */
            <div>
              <h3 className="font-medium mb-4">Select Preset Music</h3>
              <div className="grid grid-cols-2 gap-3">
                {presetSounds.map((sound) => (
                  <div
                    key={sound.key}
                    onClick={() => setSelectedPreset(sound.key)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedPreset === sound.key
                        ? 'bg-primary text-black'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <i className="ri-volume-up-line text-2xl"></i>
                      <div>
                        <div className="font-medium">{sound.label}</div>
                        <div className={`text-sm ${
                          selectedPreset === sound.key ? 'text-black/70' : 'text-gray-400'
                        }`}>
                          {formatDuration(sound.duration)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 업로드 섹션 */
            <>
              <div className="mb-6">
            <h3 className="font-medium mb-4">Upload Audio</h3>
            <div 
              className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <i className="ri-upload-cloud-line text-4xl text-gray-400 mb-3"></i>
              <div className="text-gray-400 mb-2">
                Drag and drop audio files or click to upload
              </div>
              <div className="text-sm text-gray-500 mb-4">
                Supported formats: MP3, WAV, M4A, OGG, AAC
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="audio/*" 
                multiple
                className="hidden" 
                id="audio-upload"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-6 py-2 bg-primary rounded-button text-black hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Browse Files'}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Uploaded Audio ({uploadedAudios.length})</h3>
              {uploadedAudios.length > 0 && (
                <button 
                  onClick={handleSelectAll}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  {selectedAudioIds.size === uploadedAudios.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            {uploadedAudios.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No audio files uploaded. Please upload audio files.
              </div>
            ) : (
              <div className="space-y-2">
                {uploadedAudios.map((audio) => (
                  <div 
                    key={audio.id}
                    className="flex items-center gap-3 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg group"
                  >
                    <input 
                      type="checkbox"
                      checked={selectedAudioIds.has(audio.id)}
                      onChange={() => handleToggleSelect(audio.id)}
                      className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary"
                    />
                    
                    <button 
                      onClick={() => handlePlayPause(audio)}
                      className="w-10 h-10 flex items-center justify-center bg-gray-900 rounded-full hover:bg-gray-800 transition-colors"
                    >
                      <i className={playingAudioId === audio.id ? 'ri-pause-fill' : 'ri-play-fill'}></i>
                    </button>
                    
                    <div className="flex-1">
                      <div className="font-medium text-sm">{audio.name}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDuration(audio.duration)} • {formatFileSize(audio.size)}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleRemoveAudio(audio.id)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <i className="ri-delete-bin-line text-red-400"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
            </>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {selectedAudioIds.size > 0 && (
                <span>{selectedAudioIds.size} selected</span>
              )}
            </div>
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-gray-700 rounded-button hover:bg-gray-600"
              >
                Close
              </button>
              <button 
                onClick={handleAddSelectedToTimeline}
                disabled={
                  activeTab === 'preset' 
                    ? !selectedPreset 
                    : selectedAudioIds.size === 0
                }
                className="px-6 py-2 bg-primary rounded-button hover:bg-primary/90 text-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {activeTab === 'preset' 
                  ? `Add Preset Music` 
                  : `Add Selected to Timeline (${selectedAudioIds.size})`
                }
              </button>
              {onCreateVideo && (
                <button
                  onClick={onCreateVideo}
                  className="px-6 py-2 bg-primary rounded-button hover:bg-primary/90 text-black flex items-center gap-2"
                >
                  <i className="ri-arrow-up-line text-xl"></i>
                  {t('videoEditor.controls.create')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}