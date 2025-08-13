'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import SoundGenerationModal from './SoundGenerationModal';

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

export default function SoundLibraryModal({ onClose, onSelectSounds }: SoundLibraryModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'preset' | 'upload' | 'generate'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [uploadedAudios, setUploadedAudios] = useState<UploadedAudio[]>([]);
  const [selectedAudioIds, setSelectedAudioIds] = useState<Set<string>>(new Set());
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSoundGenerationModalOpen, setIsSoundGenerationModalOpen] = useState(false);
  const [generatedSounds, setGeneratedSounds] = useState<UploadedAudio[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 캐싱 관련 ref
  const soundCacheRef = useRef<UploadedAudio[]>([]);
  const cacheTimestampRef = useRef<number>(0);
  const CACHE_DURATION = 60000; // 1분 캐시
  
  // 프리셋 음악 옵션들
  const presetSounds = [
    { key: 'epicTheme', label: t('videoEditor.controls.soundOptions.epicTheme'), duration: 180 },
    { key: 'dramatic', label: t('videoEditor.controls.soundOptions.dramatic'), duration: 120 },
    { key: 'ambient', label: t('videoEditor.controls.soundOptions.ambient'), duration: 240 },
    { key: 'sfx', label: t('videoEditor.controls.soundOptions.sfx'), duration: 60 },
  ];

  // Generate 탭으로 전환 시 과거 생성 기록 불러오기
  useEffect(() => {
    if (activeTab === 'generate' && !isLoadingHistory) {
      loadSoundHistory(); // 캐시가 있으면 사용, 없으면 로드
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // isLoadingHistory와 loadSoundHistory는 의도적으로 제외

  const loadSoundHistory = async (forceRefresh = false) => {
    // 캐시 유효성 검사
    const now = Date.now();
    if (!forceRefresh && 
        soundCacheRef.current.length > 0 && 
        (now - cacheTimestampRef.current) < CACHE_DURATION) {
      // 캐시된 데이터 사용
      setGeneratedSounds(soundCacheRef.current);
      return;
    }

    if (isLoadingHistory) return; // 중복 호출 방지
    
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/sound/history');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.sounds) {
          // 과거 기록을 UploadedAudio 형식으로 변환
          const historySounds: UploadedAudio[] = data.sounds.map((sound: { id: string; name: string; url: string; duration: number }) => ({
            id: sound.id,
            name: sound.name,
            url: sound.url,
            duration: sound.duration,
            size: 0, // 과거 기록은 size 정보 없음
          }));
          
          // 캐시 업데이트
          soundCacheRef.current = historySounds;
          cacheTimestampRef.current = now;
          
          setGeneratedSounds(historySounds);
        }
      }
    } catch (error) {
      console.error('Failed to load sound history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

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
    } else if (activeTab === 'generate') {
      const selectedAudios = generatedSounds
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSoundGenerated = async (sound: { url: string; title?: string; duration: number }) => {
    // 생성 완료 시 캐시 무효화 후 DB 새로고침
    await loadSoundHistory(true); // 강제 새로고침
    
    // 새로 생성된 사운드 자동 선택 (첫 번째 항목이 가장 최신)
    setGeneratedSounds(prev => {
      if (prev.length > 0) {
        setSelectedAudioIds(ids => {
          const newSet = new Set(ids);
          newSet.add(prev[0].id); // 가장 최신 사운드 선택
          return newSet;
        });
      }
      return prev;
    });
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
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'generate' 
                  ? 'bg-primary text-black' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Create Sound
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
          ) : activeTab === 'generate' ? (
            /* AI 생성 섹션 */
            <div>
              <div className="mb-6">
                <h3 className="font-medium mb-4">AI Sound Generation</h3>
                <button
                  onClick={() => setIsSoundGenerationModalOpen(true)}
                  className="w-full p-6 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg hover:from-purple-600/30 hover:to-blue-600/30 transition-all group"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <i className="ri-magic-line text-3xl text-primary"></i>
                    </div>
                    <div>
                      <div className="font-medium text-lg mb-1">Generate Sound with AI</div>
                      <div className="text-sm text-gray-400">
                        Create custom sound effects from text descriptions
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Generated Sounds ({generatedSounds.length})</h3>
                  {generatedSounds.length > 0 && (
                    <button 
                      onClick={() => {
                        if (selectedAudioIds.size === generatedSounds.length) {
                          setSelectedAudioIds(new Set());
                        } else {
                          setSelectedAudioIds(new Set(generatedSounds.map(s => s.id)));
                        }
                      }}
                      className="text-sm text-primary hover:text-primary/80"
                    >
                      {selectedAudioIds.size === generatedSounds.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                {isLoadingHistory ? (
                  <div className="text-center py-8 text-gray-500">
                    <i className="ri-loader-4-line animate-spin text-2xl mb-2"></i>
                    <div>Loading sound history...</div>
                  </div>
                ) : generatedSounds.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No generated sounds yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {generatedSounds.map((audio) => (
                      <div 
                        key={audio.id}
                        onClick={() => handleToggleSelect(audio.id)}
                        className="flex items-center gap-3 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg group cursor-pointer"
                      >
                        <input 
                          type="checkbox"
                          checked={selectedAudioIds.has(audio.id)}
                          onChange={() => handleToggleSelect(audio.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary"
                        />
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayPause(audio);
                          }}
                          className="w-10 h-10 flex items-center justify-center bg-gray-900 rounded-full hover:bg-gray-800 transition-colors"
                        >
                          <i className={playingAudioId === audio.id ? 'ri-pause-fill' : 'ri-play-fill'}></i>
                        </button>
                        
                        <div className="flex-1">
                          <div className="font-medium text-sm">{audio.name}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDuration(audio.duration)}
                          </div>
                        </div>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setGeneratedSounds(prev => prev.filter(s => s.id !== audio.id));
                            setSelectedAudioIds(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(audio.id);
                              return newSet;
                            });
                          }}
                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <i className="ri-delete-bin-line text-red-400"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                    onClick={() => handleToggleSelect(audio.id)}
                    className="flex items-center gap-3 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg group cursor-pointer"
                  >
                    <input 
                      type="checkbox"
                      checked={selectedAudioIds.has(audio.id)}
                      onChange={() => handleToggleSelect(audio.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary"
                    />
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPause(audio);
                      }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAudio(audio.id);
                      }}
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
                    : activeTab === 'generate'
                    ? selectedAudioIds.size === 0 || generatedSounds.filter(s => selectedAudioIds.has(s.id)).length === 0
                    : selectedAudioIds.size === 0
                }
                className="px-6 py-2 bg-primary rounded-button hover:bg-primary/90 text-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {activeTab === 'preset' 
                  ? `Add Preset Music` 
                  : activeTab === 'generate'
                  ? `Add Generated to Timeline (${generatedSounds.filter(s => selectedAudioIds.has(s.id)).length})`
                  : `Add Selected to Timeline (${selectedAudioIds.size})`
                }
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sound Generation Modal */}
      <SoundGenerationModal
        isOpen={isSoundGenerationModalOpen}
        onClose={() => setIsSoundGenerationModalOpen(false)}
        onSoundGenerated={handleSoundGenerated}
      />
    </div>
  );
}