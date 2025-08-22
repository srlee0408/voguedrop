'use client';

import { useState, useRef, useEffect, useContext } from 'react';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { VideoClipSelector } from './VideoClipSelector';
import { useVideoSoundGeneration } from '../_hooks/useVideoSoundGeneration';
import { ClipContext } from '../_context/ClipContext';
import { formatSoundDisplayTitle } from '@/lib/sound/utils';
import { SoundGenerationType } from '@/shared/types/sound';
import { 
  useSoundHistory, 
  useSoundGeneration
} from '../_hooks/useSoundHistoryQuery';
import { 
  useUploadedMusic, 
  useUploadMusic,
  useDeleteUploadedMusic,
  type UploadedAudio
} from '../_hooks/useUploadedMusicQuery';

interface SoundLibraryModalProps {
  onClose: () => void;
  onSelectSounds: (sounds: Array<{ name: string; url: string; duration: number }>) => void;
  onCreateVideo?: () => void;
}

export default function SoundLibraryModal({ onClose, onSelectSounds }: SoundLibraryModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'preset' | 'upload' | 'generate'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedAudioIds, setSelectedAudioIds] = useState<Set<string>>(new Set());
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  
  // AI Sound Generation states
  const [soundPrompt, setSoundPrompt] = useState('');
  const [soundTitle, setSoundTitle] = useState('');
  const [soundDuration, setSoundDuration] = useState(8);
  const [isGeneratingSound, setIsGeneratingSound] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [inputMode, setInputMode] = useState<'manual' | 'fromVideo'>('manual');
  const [selectedVideoClip, setSelectedVideoClip] = useState<string | null>(null);
  const [generationType, setGenerationType] = useState<SoundGenerationType>('sound_effect');
  
  const clipContext = useContext(ClipContext);
  const timelineClips = clipContext?.timelineClips || [];
  
  const videoSoundGeneration = useVideoSoundGeneration();
  
  // React Query Hooks
  const { 
    data: soundGroups = [], 
    isLoading: isLoadingHistory,
    refetch: refetchSoundHistory 
  } = useSoundHistory('all', activeTab === 'generate');
  
  const { 
    data: uploadedAudios = [], 
    isLoading: isLoadingUploaded
  } = useUploadedMusic(undefined, activeTab === 'upload');
  
  const soundGenerationMutation = useSoundGeneration();
  const uploadMusicMutation = useUploadMusic();
  const deleteMusicMutation = useDeleteUploadedMusic();
  
  interface JobProgress {
    jobId: string;
    variationNumber: number;
    progress: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: {
      url: string;
      title?: string;
      duration: number;
    };
  }

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const calculateProgressForElapsedTime = (elapsedSeconds: number, expectedDuration: number = 15): number => {
    const checkpoints = [
      { time: 2, progress: 15 },
      { time: 4, progress: 30 },
      { time: 6, progress: 50 },
      { time: 8, progress: 65 },
      { time: 10, progress: 80 },
      { time: 12, progress: 88 },
      { time: 15, progress: 90 }
    ];
    
    let targetProgress = 0;
    
    for (let i = 0; i < checkpoints.length; i++) {
      const checkpoint = checkpoints[i];
      const nextCheckpoint = checkpoints[i + 1];
      
      if (elapsedSeconds >= checkpoint.time) {
        if (!nextCheckpoint || elapsedSeconds < nextCheckpoint.time) {
          if (nextCheckpoint) {
            const timeRatio = (elapsedSeconds - checkpoint.time) / (nextCheckpoint.time - checkpoint.time);
            const progressDiff = nextCheckpoint.progress - checkpoint.progress;
            targetProgress = checkpoint.progress + (progressDiff * timeRatio);
          } else {
            targetProgress = checkpoint.progress;
          }
          break;
        }
      } else if (i === 0) {
        targetProgress = (elapsedSeconds / checkpoint.time) * checkpoint.progress;
        break;
      }
    }
    
    if (elapsedSeconds > expectedDuration) {
      const overtime = elapsedSeconds - expectedDuration;
      const slowdown = Math.log(1 + overtime / expectedDuration) * 2;
      targetProgress = Math.max(85, 90 - slowdown);
    }
    
    return Math.min(targetProgress, 90);
  };

  const presetSounds = [
    { key: 'epicTheme', label: t('videoEditor.controls.soundOptions.epicTheme'), duration: 180 },
    { key: 'dramatic', label: t('videoEditor.controls.soundOptions.dramatic'), duration: 120 },
    { key: 'ambient', label: t('videoEditor.controls.soundOptions.ambient'), duration: 240 },
    { key: 'sfx', label: t('videoEditor.controls.soundOptions.sfx'), duration: 60 },
  ];


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDurationDropdown && !target.closest('.duration-dropdown-container')) {
        setShowDurationDropdown(false);
      }
    };

    if (showDurationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDurationDropdown]);


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

    const newAudioIds: string[] = [];
    
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('audio/')) {
          alert(`${file.name} is not an audio file.`);
          continue;
        }

        const duration = await getAudioDuration(file);
        
        const uploadedMusic = await uploadMusicMutation.mutateAsync({
          file,
          duration
        });
        
        newAudioIds.push(uploadedMusic.id);
      }
      
      setSelectedAudioIds(prev => {
        const newSet = new Set(prev);
        newAudioIds.forEach(id => newSet.add(id));
        return newSet;
      });
      
      if (newAudioIds.length > 0) {
        console.log(`Successfully uploaded ${newAudioIds.length} audio file(s)`);
      }
    } catch (error) {
      console.error('Error uploading audio:', error);
      alert(error instanceof Error ? error.message : 'Error uploading audio file.');
    } finally {
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

  const handlePlayPause = (audio: UploadedAudio | { id: string; url: string; file_name?: string; name?: string }) => {
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
          url: '', 
          duration: preset.duration,
        }]);
        onClose();
      }
    } else if (activeTab === 'upload') {
      const selectedAudios = uploadedAudios
        .filter(audio => selectedAudioIds.has(audio.id))
        .map(audio => ({
          name: audio.file_name,
          url: audio.url,
          duration: audio.duration || 0,
        }));
      
      if (selectedAudios.length > 0) {
        onSelectSounds(selectedAudios);
        onClose();
      }
    } else if (activeTab === 'generate') {
      const selectedAudios: Array<{ name: string; url: string; duration: number }> = [];
      
      soundGroups.forEach(group => {
        group.variations.forEach((variation) => {
          if (selectedAudioIds.has(variation.id)) {
            selectedAudios.push({
              name: `${group.prompt} - Sample ${variation.variationNumber}`,
              url: variation.url,
              duration: variation.duration,
            });
          }
        });
      });
      
      if (selectedAudios.length > 0) {
        onSelectSounds(selectedAudios);
        onClose();
      }
    }
  };

  const handleSoundGenerate = async () => {
    if (inputMode === 'manual') {
      if (!soundPrompt.trim()) {
        setGenerationError('Please enter a sound description.');
        return;
      }

      if (soundPrompt.length > 450) {
        setGenerationError('Description cannot exceed 450 characters.');
        return;
      }
    }
    
    if (inputMode === 'fromVideo') {
      if (!selectedVideoClip) {
        setGenerationError('Please select a video clip.');
        return;
      }
      
      const selectedClip = timelineClips.find(c => c.id === selectedVideoClip);
      if (!selectedClip) {
        setGenerationError('Selected video clip not found.');
        return;
      }
    }

    setIsGeneratingSound(true);
    setGenerationError(null);

    try {
      let jobIds: string[];
      
      if (inputMode === 'manual') {
        const data = await soundGenerationMutation.mutateAsync({
          prompt: soundPrompt.trim(),
          title: soundTitle.trim() || undefined,
          duration_seconds: soundDuration,
          generation_type: generationType,
        });

        jobIds = data.jobIds;
      } else {
        const selectedClip = timelineClips.find(c => c.id === selectedVideoClip);
        if (!selectedClip) {
          throw new Error('Selected video clip not found');
        }
        
        const completedJobIds = await videoSoundGeneration.generateFromVideo(
          selectedClip,
          soundDuration
        );
        
        if (completedJobIds.length > 0) {
          refetchSoundHistory();
          setIsGeneratingSound(false);
          setSoundPrompt('');
          setSoundTitle('');
          setSelectedVideoClip(null);
          return;
        } else {
          throw new Error('Video-based sound generation failed');
        }
      }
      
      const jobProgresses: JobProgress[] = jobIds.map((jobId: string, index: number) => ({
        jobId,
        variationNumber: index + 1,
        progress: 0,
        status: 'processing' as const
      }));

      const startTimes = new Map<string, number>();
      jobIds.forEach((jobId: string) => {
        startTimes.set(jobId, Date.now() + Math.random() * 2000);
      });
      
      const progressInterval = setInterval(() => {
        jobProgresses.forEach(job => {
          if (job.status === 'completed' || job.status === 'failed') return;
          
          const startTime = startTimes.get(job.jobId) || Date.now();
          const elapsed = Math.max(0, (Date.now() - startTime) / 1000);
          const newProgress = calculateProgressForElapsedTime(elapsed, 15);
          
          job.progress = Math.floor(newProgress);
        });
      }, 500);

      const pollIntervals = new Map<string, NodeJS.Timeout>();
      const pollCounts = new Map<string, number>();
      const maxPolls = 60;
      
      jobIds.forEach((jobId: string) => {
        pollCounts.set(jobId, 0);
        
        const interval = setInterval(async () => {
          const currentPollCount = (pollCounts.get(jobId) || 0) + 1;
          pollCounts.set(jobId, currentPollCount);
          
          const endpoint = currentPollCount > 150
            ? `/api/sound/jobs/${jobId}/poll`
            : `/api/sound/jobs/${jobId}`;
          
          try {
            const statusResponse = await fetch(endpoint);
            const status = await statusResponse.json();
            
            if (status.status === 'completed') {
              clearInterval(interval);
              pollIntervals.delete(jobId);
              
              const jobIndex = jobProgresses.findIndex(j => j.jobId === jobId);
              if (jobIndex !== -1) {
                jobProgresses[jobIndex].status = 'completed';
                jobProgresses[jobIndex].progress = 100;
              }
              
            } else if (status.status === 'failed') {
              clearInterval(interval);
              pollIntervals.delete(jobId);
              
              const jobIndex = jobProgresses.findIndex(j => j.jobId === jobId);
              if (jobIndex !== -1) {
                jobProgresses[jobIndex].status = 'failed';
                jobProgresses[jobIndex].progress = 0;
              }
              
            } else if (currentPollCount >= maxPolls) {
              clearInterval(interval);
              pollIntervals.delete(jobId);
              
              const jobIndex = jobProgresses.findIndex(j => j.jobId === jobId);
              if (jobIndex !== -1) {
                jobProgresses[jobIndex].status = 'failed';
                jobProgresses[jobIndex].progress = 0;
              }
            }
          } catch (err) {
            console.error(`Polling error for job ${jobId}:`, err);
          }
        }, 2000);
        
        pollIntervals.set(jobId, interval);
      });
      
      const checkAllCompleted = setInterval(() => {
        const allDone = jobProgresses.every(job => job.status === 'completed' || job.status === 'failed');
        const hasSuccess = jobProgresses.some(job => job.status === 'completed');
        
        if (allDone) {
          clearInterval(checkAllCompleted);
          clearInterval(progressInterval);
          pollIntervals.forEach(interval => clearInterval(interval));
          
          if (!hasSuccess) {
            setGenerationError('All sound generation failed.');
            setIsGeneratingSound(false);
          } else {
            refetchSoundHistory();
            setIsGeneratingSound(false);
            setSoundPrompt('');
            setSoundTitle('');
          }
        }
      }, 1000);

    } catch (err) {
      console.error('Sound generation error:', err);
      setGenerationError(err instanceof Error ? err.message : 'An error occurred during sound generation.');
      setIsGeneratingSound(false);
    }
  };

  const handleRemoveAudio = async (audioId: string) => {
    try {
      await deleteMusicMutation.mutateAsync(audioId);
      
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
    } catch (error) {
      console.error('Failed to delete audio:', error);
      alert('Failed to delete audio file.');
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
            <div>
              <div className="mb-6">
                <h3 className="font-medium mb-4">AI Sound Generation</h3>
                
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => {
                      setInputMode('manual');
                      setGenerationError(null);
                      videoSoundGeneration.clearError();
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      inputMode === 'manual'
                        ? 'bg-primary text-black'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <i className="ri-edit-line"></i>
                    <span>Write description</span>
                  </button>
                  <button
                    onClick={() => {
                      setInputMode('fromVideo');
                      setGenerationError(null);
                      videoSoundGeneration.clearError();
                    }}
                    disabled={timelineClips.length === 0}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      inputMode === 'fromVideo'
                        ? 'bg-primary text-black'
                        : 'bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    <i className="ri-video-line"></i>
                    <span>From video clip</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {inputMode === 'manual' ? (
                    <div className="space-y-3">
                      <div className="flex gap-2 p-3 bg-gray-700/50 rounded-lg">
                        <button
                          onClick={() => setGenerationType('sound_effect')}
                          className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                            generationType === 'sound_effect'
                              ? 'bg-primary text-black'
                              : 'bg-gray-800 hover:bg-gray-700'
                          }`}
                          disabled={isGeneratingSound}
                        >
                          <i className="ri-volume-up-line mr-2"></i>
                          Sound Effect
                        </button>
                        <button
                          onClick={() => setGenerationType('music')}
                          className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                            generationType === 'music'
                              ? 'bg-primary text-black'
                              : 'bg-gray-800 hover:bg-gray-700'
                          }`}
                          disabled={isGeneratingSound}
                        >
                          <i className="ri-music-2-line mr-2"></i>
                          Music
                          <span className={`ml-1 text-xs ${
                            generationType === 'music' ? 'text-black/70' : 'text-gray-500'
                          }`}>(32s)</span>
                        </button>
                      </div>
                      
                      <div className="p-4 bg-gray-700/50 rounded-lg">
                        <div className="text-sm text-gray-400 mb-2">
                          Title <span className="text-gray-500">(optional)</span>
                        </div>
                        <input
                          type="text"
                          value={soundTitle}
                          onChange={(e) => setSoundTitle(e.target.value)}
                          placeholder="Uses description if empty"
                          className="w-full px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          disabled={isGeneratingSound}
                          maxLength={100}
                        />
                      </div>
                      
                      <div className="p-4 bg-gray-700/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-gray-400">
                            Description <span className="text-red-400">*</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {soundPrompt.length}/450
                          </span>
                        </div>
                        <div className="flex items-start gap-3">
                          <textarea
                            value={soundPrompt}
                            onChange={(e) => {
                              setSoundPrompt(e.target.value);
                              setGenerationError(null);
                            }}
                            placeholder="Describe the sound you want to generate..."
                            className="flex-1 px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[40px] max-h-[120px] overflow-y-auto"
                            disabled={isGeneratingSound}
                            maxLength={450}
                            rows={1}
                            style={{
                              height: 'auto',
                              minHeight: '40px'
                            }}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                            }}
                          />
                          
                          {generationType === 'sound_effect' && (
                            <div className="relative duration-dropdown-container">
                              <button
                                onClick={() => setShowDurationDropdown(!showDurationDropdown)}
                                disabled={isGeneratingSound}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                              >
                                <span className="text-sm min-w-[55px]">↔ {soundDuration}.0s</span>
                              </button>
                              
                              {showDurationDropdown && (
                                <div className="absolute top-full mt-2 left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl shadow-black/50 z-10 p-4 w-80">
                                  <div className="text-sm text-gray-400 mb-2">Duration</div>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="range"
                                      min="1"
                                      max="22"
                                      value={soundDuration}
                                      onChange={(e) => setSoundDuration(Number(e.target.value))}
                                      className="flex-1 accent-primary"
                                    />
                                    <span className="text-sm text-gray-300 min-w-[50px] text-right">
                                      ↔ {soundDuration}.0s
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <button
                            onClick={handleSoundGenerate}
                            disabled={soundGenerationMutation.isPending || isGeneratingSound || !soundPrompt.trim()}
                            className="px-6 py-2 bg-primary rounded-button hover:bg-primary/90 text-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center"
                          >
                            {(soundGenerationMutation.isPending || isGeneratingSound) ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Generating</span>
                              </>
                            ) : (
                              <>
                                <i className="ri-magic-line"></i>
                                <span>Generate</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <VideoClipSelector
                        clips={timelineClips}
                        selectedClipId={selectedVideoClip}
                        onSelectClip={setSelectedVideoClip}
                        disabled={isGeneratingSound || videoSoundGeneration.isGenerating}
                      />
                      
                      <div className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg">
                        <div className="relative duration-dropdown-container">
                          <button
                            onClick={() => setShowDurationDropdown(!showDurationDropdown)}
                            disabled={isGeneratingSound || videoSoundGeneration.isGenerating}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                          >
                            <span className="text-sm min-w-[55px]">↔ {soundDuration}.0s</span>
                          </button>
                          
                          {showDurationDropdown && (
                            <div className="absolute top-full mt-2 left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl shadow-black/50 z-10 p-4 w-80">
                              <div className="text-sm text-gray-400 mb-2">Duration</div>
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min="1"
                                  max="22"
                                  value={soundDuration}
                                  onChange={(e) => setSoundDuration(Number(e.target.value))}
                                  className="flex-1 accent-primary"
                                />
                                <span className="text-sm text-gray-300 min-w-[50px] text-right">
                                  ↔ {soundDuration}.0s
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1"></div>
                        
                        <button
                          onClick={handleSoundGenerate}
                          disabled={soundGenerationMutation.isPending || isGeneratingSound || videoSoundGeneration.isGenerating || !selectedVideoClip}
                          className="px-6 py-2 bg-primary rounded-button hover:bg-primary/90 text-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center"
                        >
                          {(soundGenerationMutation.isPending || isGeneratingSound || videoSoundGeneration.isGenerating) ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Generating</span>
                            </>
                          ) : (
                            <>
                              <i className="ri-magic-line"></i>
                              <span>Generate from Video</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                  
                  {(generationError || videoSoundGeneration.error || soundGenerationMutation.error) && (
                    <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                      {generationError || videoSoundGeneration.error || soundGenerationMutation.error?.message}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">
                    Generated Sounds 
                    {soundGroups.length > 0 && (
                      <span className="text-gray-400 ml-2">
                        ({soundGroups.reduce((acc, g) => acc + g.variations.length, 0)} in {soundGroups.length} groups)
                      </span>
                    )}
                  </h3>
                </div>
                {isLoadingHistory ? (
                  <div className="text-center py-8 text-gray-500">
                    <i className="ri-loader-4-line animate-spin text-2xl mb-2"></i>
                    <div>Loading sound history...</div>
                  </div>
                ) : soundGroups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No generated sounds yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {soundGroups.map((group) => (
                      <div key={group.groupId} className="border border-gray-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => {
                            setExpandedGroups(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(group.groupId)) {
                                newSet.delete(group.groupId);
                              } else {
                                newSet.add(group.groupId);
                              }
                              return newSet;
                            });
                          }}
                          className="w-full px-4 py-3 flex items-start gap-2 hover:bg-gray-700/50 transition-colors text-left"
                        >
                          <div className="mt-1">
                            {expandedGroups.has(group.groupId) ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {formatSoundDisplayTitle(group.title, group.prompt)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                              <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                              {group.generationType && (
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  group.generationType === 'music' 
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : group.generationType === 'from_video'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-green-500/20 text-green-400'
                                }`}>
                                  {group.generationType === 'sound_effect' ? 'Sound Effect' :
                                   group.generationType === 'music' ? 'Music' :
                                   group.generationType === 'from_video' ? 'From Video' :
                                   group.generationType}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                        
                        {expandedGroups.has(group.groupId) && (
                          <div className="px-4 pb-3 space-y-2 border-t border-gray-700">
                            {group.variations.map((variation) => (
                              <div 
                                key={variation.id}
                                onClick={() => handleToggleSelect(variation.id)}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/30 cursor-pointer"
                              >
                                <input 
                                  type="checkbox"
                                  checked={selectedAudioIds.has(variation.id)}
                                  onChange={() => handleToggleSelect(variation.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary"
                                />
                                
                                <span className="text-sm text-gray-400">
                                  {variation.variationNumber}.
                                </span>
                                
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayPause({
                                      id: variation.id,
                                      url: variation.url
                                    });
                                  }}
                                  className="w-8 h-8 flex items-center justify-center bg-gray-900 rounded-full hover:bg-gray-800 transition-colors"
                                >
                                  <i className={playingAudioId === variation.id ? 'ri-pause-fill text-sm' : 'ri-play-fill text-sm'}></i>
                                </button>
                                
                                <div className="flex-1">
                                  <div className="text-sm">Sample {variation.variationNumber}</div>
                                  <div className="text-xs text-gray-500">
                                    {formatDuration(variation.duration)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
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
                disabled={uploadMusicMutation.isPending}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMusicMutation.isPending}
                className="px-6 py-2 bg-primary rounded-button text-black hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadMusicMutation.isPending ? 'Uploading...' : 'Browse Files'}
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
            {isLoadingUploaded ? (
              <div className="text-center py-8 text-gray-500">
                <i className="ri-loader-4-line animate-spin text-2xl mb-2"></i>
                <div>Loading uploaded music...</div>
              </div>
            ) : uploadedAudios.length === 0 ? (
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
                      <div className="font-medium text-sm">{audio.file_name}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDuration(audio.duration || 0)} • {formatFileSize(audio.file_size)}
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAudio(audio.id);
                      }}
                      disabled={deleteMusicMutation.isPending}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}