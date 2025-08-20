'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { VideoClip, TextClip, SoundClip, LibraryVideo, LibraryProject, UserUploadedVideo, LibraryItem } from '@/shared/types/video-editor';
import { toast } from 'sonner';
import {
  duplicateVideoClip,
  duplicateTextClip,
  duplicateSoundClip,
  splitVideoClip,
  splitTextClip,
  splitSoundClip,
  applyResizeTrim,
} from '../_utils/clip-operations';
import { analyzeAudioFile } from '../_utils/audio-analysis';
import { calculateTimelineDuration } from '../_utils/timeline-helpers';

interface ClipContextType {
  // 상태
  timelineClips: VideoClip[];
  textClips: TextClip[];
  soundClips: SoundClip[];
  selectedTextClip: string | null;
  hasUnsavedChanges: boolean;
  lastModifiedAt: Date | null;
  
  // Setter 함수들
  setTimelineClips: React.Dispatch<React.SetStateAction<VideoClip[]>>;
  setTextClips: React.Dispatch<React.SetStateAction<TextClip[]>>;
  setSoundClips: React.Dispatch<React.SetStateAction<SoundClip[]>>;
  setSelectedTextClip: React.Dispatch<React.SetStateAction<string | null>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  
  // 비디오 클립 관련 함수
  handleAddToTimeline: (items: LibraryItem[]) => Promise<void>;
  handleDeleteVideoClip: (id: string) => void;
  handleDuplicateVideoClip: (id: string) => void;
  handleSplitVideoClip: (id: string, currentTime: number, pixelsPerSecond: number) => void;
  handleResizeVideoClip: (id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => void;
  handleUpdateVideoClipPosition: (id: string, newPosition: number) => void;
  handleUpdateAllVideoClips: (newClips: VideoClip[]) => void;
  handleReorderVideoClips: (newClips: VideoClip[]) => void;
  
  // 텍스트 클립 관련 함수
  handleAddTextClip: (textData: Partial<TextClip>) => void;
  handleEditTextClip: (clip: TextClip) => void;
  handleDeleteTextClip: (id: string) => void;
  handleDuplicateTextClip: (id: string) => void;
  handleSplitTextClip: (id: string, currentTime: number, pixelsPerSecond: number) => void;
  handleResizeTextClip: (id: string, newDuration: number) => void;
  handleUpdateTextClipPosition: (id: string, newPosition: number) => void;
  handleUpdateAllTextClips: (newClips: TextClip[]) => void;
  handleReorderTextClips: (newClips: TextClip[]) => void;
  handleUpdateTextPosition: (id: string, x: number, y: number) => void;
  handleUpdateTextSize: (id: string, fontSize: number, fontSizeRatio: number) => void;
  
  // 사운드 클립 관련 함수
  handleAddSoundClip: (soundData: Partial<SoundClip>) => void;
  handleAddSoundClips: (sounds: { name: string; url: string; duration: number }[]) => Promise<void>;
  handleDeleteSoundClip: (id: string) => void;
  handleDuplicateSoundClip: (id: string) => void;
  handleSplitSoundClip: (id: string, currentTime: number, pixelsPerSecond: number) => void;
  handleResizeSoundClip: (id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => void;
  handleUpdateSoundClipPosition: (id: string, newPosition: number) => void;
  handleUpdateAllSoundClips: (newClips: SoundClip[]) => void;
  handleReorderSoundClips: (newClips: SoundClip[]) => void;
  handleUpdateSoundVolume: (id: string, volume: number) => void;
  handleUpdateSoundFade: (id: string, fadeType: 'fadeIn' | 'fadeOut', duration: number) => void;
  
  // 편집 상태
  editingTextClip?: TextClip;
  setEditingTextClip: React.Dispatch<React.SetStateAction<TextClip | undefined>>;
  
  // 히스토리 저장 콜백 (HistoryContext에서 주입)
  saveToHistory?: () => void;
  setSaveToHistoryCallback?: React.Dispatch<React.SetStateAction<(() => void) | null>>;
}

export const ClipContext = createContext<ClipContextType | undefined>(undefined);

const PIXELS_PER_SECOND = 40;
const MAX_TIMELINE_DURATION_SECONDS = 120; // 2분 제한

interface ClipProviderProps {
  children: ReactNode;
}

export function ClipProvider({ children }: ClipProviderProps) {
  // 상태 (page.tsx에서 그대로 가져옴)
  const [timelineClips, setTimelineClips] = useState<VideoClip[]>([]);
  const [textClips, setTextClips] = useState<TextClip[]>([]);
  const [soundClips, setSoundClips] = useState<SoundClip[]>([]);
  const [selectedTextClip, setSelectedTextClip] = useState<string | null>(null);
  const [editingTextClip, setEditingTextClip] = useState<TextClip | undefined>(undefined);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastModifiedAt, setLastModifiedAt] = useState<Date | null>(null);
  
  // 변경사항이 있을 때 자동으로 추적
  useEffect(() => {
    if (timelineClips.length > 0 || textClips.length > 0 || soundClips.length > 0) {
      setHasUnsavedChanges(true);
      setLastModifiedAt(new Date());
    }
  }, [timelineClips, textClips, soundClips]);
  
  // 기본 saveToHistory 함수 (나중에 HistoryContext와 연결)
  const [saveToHistoryCallback, setSaveToHistoryCallback] = useState<(() => void) | null>(null);
  
  const saveToHistory = useCallback(() => {
    if (saveToHistoryCallback) {
      saveToHistoryCallback();
    }
  }, [saveToHistoryCallback]);
  
  // 프로젝트 데이터 복원 함수
  const restoreProjectData = useCallback((contentSnapshot: {
    video_clips?: VideoClip[];
    text_clips?: TextClip[];
    sound_clips?: SoundClip[];
    [key: string]: unknown;
  }) => {
    // 비디오 클립 복원
    if (contentSnapshot.video_clips) {
      const restoredVideoClips = contentSnapshot.video_clips.map((clip: VideoClip) => ({
        ...clip,
        id: clip.id || `video-${Date.now()}-${Math.random()}`,
        // 필요한 변환 작업
      }));
      setTimelineClips(restoredVideoClips);
    }
    
    // 텍스트 클립 복원
    if (contentSnapshot.text_clips) {
      setTextClips(contentSnapshot.text_clips);
    }
    
    // 사운드 클립 복원
    if (contentSnapshot.sound_clips) {
      setSoundClips(contentSnapshot.sound_clips);
    }
    
    // 히스토리 초기화 (새 프로젝트를 로드했으므로)
    // HistoryContext와 연결되면 clearHistory 호출
  }, []);
  
  // ProjectContext에서 발생시킨 이벤트 리스닝
  useEffect(() => {
    const handleProjectDataLoaded = (event: CustomEvent) => {
      restoreProjectData(event.detail);
    };
    
    window.addEventListener('projectDataLoaded', handleProjectDataLoaded as EventListener);
    
    return () => {
      window.removeEventListener('projectDataLoaded', handleProjectDataLoaded as EventListener);
    };
  }, [restoreProjectData]);
  
  // 마지막 경고 시간 추적 (중복 경고 방지)
  const [lastWarningTime, setLastWarningTime] = useState<number>(0);
  
  // 타임라인 전체 길이 모니터링
  useEffect(() => {
    const totalDuration = calculateTimelineDuration(timelineClips, textClips, soundClips, PIXELS_PER_SECOND);
    const isOverLimit = totalDuration > MAX_TIMELINE_DURATION_SECONDS;
    
    if (isOverLimit) {
      const now = Date.now();
      // 5초 내 중복 경고 방지
      if (now - lastWarningTime > 5000) {
        const minutes = Math.floor(totalDuration / 60);
        const seconds = Math.floor(totalDuration % 60);
        toast.warning(
          `Timeline cannot exceed 2 minutes (Current: ${minutes}m ${seconds}s)`,
          { duration: 5000 }
        );
        setLastWarningTime(now);
      }
    }
  }, [timelineClips, textClips, soundClips, lastWarningTime]);
  
  // 비디오 URL로부터 길이(초)를 읽어오는 헬퍼 (page.tsx에서 그대로)
  const getVideoDurationSeconds = useCallback((url?: string): Promise<number> => {
    return new Promise((resolve) => {
      if (!url) {
        resolve(0);
        return;
      }
      try {
        const videoEl = document.createElement('video');
        videoEl.preload = 'metadata';
        videoEl.src = url;
        const onLoaded = () => {
          const seconds = isFinite(videoEl.duration) ? videoEl.duration : 0;
          cleanup();
          resolve(seconds || 0);
        };
        const onError = () => {
          cleanup();
          resolve(0);
        };
        const cleanup = () => {
          videoEl.removeEventListener('loadedmetadata', onLoaded);
          videoEl.removeEventListener('error', onError);
        };
        videoEl.addEventListener('loadedmetadata', onLoaded);
        videoEl.addEventListener('error', onError);
      } catch {
        resolve(0);
      }
    });
  }, []);
  
  // URL에서 파일명 추출 (page.tsx에서 그대로)
  const extractTitleFromUrl = useCallback((url?: string): string | null => {
    if (!url) return null;
    try {
      const pathname = new URL(url).pathname;
      const parts = pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (!last) return null;
      const base = last.split('?')[0].split('#')[0];
      const noExt = base.includes('.') ? base.substring(0, base.lastIndexOf('.')) : base;
      return decodeURIComponent(noExt);
    } catch {
      return null;
    }
  }, []);
  
  // 비디오 클립 추가 (LibraryItem 처리)
  const handleAddToTimeline = useCallback(async (items: LibraryItem[]) => {
    const { getTimelineEnd } = await import('../_utils/timeline-utils');
    
    const default_px = 240;
    const startPosition = getTimelineEnd(timelineClips);
    
    let currentPosition = startPosition;
    const newClips: VideoClip[] = [];
    
    for (const [index, item] of items.entries()) {
      let clipId: string;
      let url: string;
      let thumbnail: string | undefined;
      let title: string;
      let sourceType: 'clip' | 'upload' | 'project' = 'clip';
      
      if (item.type === 'clip') {
        const video = item.data as LibraryVideo;
        // job_id를 포함한 clipId 생성 (비디오 기반 음악 생성을 위해)
        clipId = `clip-${video.job_id}-${Date.now()}-${index}`;
        url = video.output_video_url;
        thumbnail = video.input_image_url;
        title = video.selected_effects?.[0]?.name || extractTitleFromUrl(video.output_video_url) || 'Video Clip';
        sourceType = 'clip'; // AI generated clip
        
        // 디버깅 로그
        console.log('Creating VideoClip from library video:', {
          originalJobId: video.job_id,
          newClipId: clipId,
          sourceType
        });
      } else if (item.type === 'project') {
        const project = item.data as LibraryProject;
        // 프로젝트는 render_id 또는 project_id 사용
        clipId = `project-${project.id}-${Date.now()}-${index}`;
        url = project.latest_video_url || '';
        thumbnail = project.thumbnail_url || undefined; // 프로젝트 썸네일 사용
        title = project.project_name || 'Project';
        sourceType = 'project'; // Project-based video
        
        // 디버깅 로그
        console.log('Creating VideoClip from project:', {
          projectId: project.id,
          newClipId: clipId,
          hasVideo: !!url,
          hasThumbnail: !!project.thumbnail_url,
          thumbnailUrl: project.thumbnail_url
        });
        
        if (!url) {
          toast.error(`Project "${title}" doesn't have a rendered video`);
          continue;
        }
      } else {
        const upload = item.data as UserUploadedVideo & { url?: string };
        // 업로드된 비디오 처리
        clipId = `upload-${upload.id}-${Date.now()}-${index}`;
        url = upload.url || '';
        thumbnail = upload.thumbnail_url || undefined; // 업로드 시 생성된 썸네일 사용
        title = upload.file_name || 'Uploaded Video';
        sourceType = 'upload'; // User uploaded video
        
        // 디버깅 로그
        console.log('Creating VideoClip from upload:', {
          uploadId: upload.id,
          newClipId: clipId,
          hasVideo: !!url,
          hasThumbnail: !!upload.thumbnail_url,
          thumbnailUrl: upload.thumbnail_url
        });
        
        if (!url) {
          toast.error(`Upload "${title}" doesn't have a valid video URL`);
          continue;
        }
      }
      
      const newClip: VideoClip = {
        id: clipId,
        duration: default_px,
        position: currentPosition,
        thumbnails: 1,
        url,
        sourceType,
        thumbnail,
        title,
        maxDuration: default_px,
        startTime: 0,
        endTime: undefined,
      };
      
      newClips.push(newClip);
      currentPosition += default_px;
      
      // 백그라운드에서 실제 duration 계산
      getVideoDurationSeconds(url).then((duration_seconds) => {
        const min_px = 80;
        const computed_px = Math.max(min_px, Math.round((duration_seconds || 0) * PIXELS_PER_SECOND));
        
        setTimelineClips(prev => {
          const clipIndex = prev.findIndex(c => c.id === clipId);
          if (clipIndex === -1) return prev;
          
          const oldDuration = prev[clipIndex].duration;
          const durationDiff = computed_px - oldDuration;
          
          return prev.map((clip, idx) => {
            if (clip.id === clipId) {
              return { ...clip, duration: computed_px, maxDuration: computed_px };
            } else if (idx > clipIndex) {
              return { ...clip, position: clip.position + durationDiff };
            }
            return clip;
          });
        });
      });
    }
    
    setTimelineClips(prev => [...prev, ...newClips]);
    saveToHistory();
  }, [timelineClips, extractTitleFromUrl, getVideoDurationSeconds, saveToHistory]);
  
  // 비디오 클립 삭제
  const handleDeleteVideoClip = useCallback((id: string) => {
    setTimelineClips(prev => prev.filter(c => c.id !== id));
    saveToHistory();
  }, [saveToHistory]);
  
  // 비디오 클립 복제
  const handleDuplicateVideoClip = useCallback((id: string) => {
    const clip = timelineClips.find(c => c.id === id);
    if (!clip) return;
    
    const duplicatedClip = duplicateVideoClip(clip, timelineClips);
    setTimelineClips([...timelineClips, duplicatedClip]);
    saveToHistory();
  }, [timelineClips, saveToHistory]);
  
  // 비디오 클립 분할
  const handleSplitVideoClip = useCallback((id: string, currentTime: number, pixelsPerSecond: number) => {
    const clip = timelineClips.find(c => c.id === id);
    if (!clip) return;
    
    const playheadPosition = currentTime * pixelsPerSecond;
    const result = splitVideoClip(clip, playheadPosition, pixelsPerSecond);
    
    if (result) {
      const { firstClip, secondClip } = result;
      setTimelineClips(timelineClips.map(c => 
        c.id === id ? firstClip : c
      ).concat(secondClip));
      saveToHistory();
    }
  }, [timelineClips, saveToHistory]);
  
  // 비디오 클립 리사이즈
  const handleResizeVideoClip = useCallback((id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => {
    if (newDuration <= 0) {
      console.error('[ClipContext] Invalid newDuration:', newDuration, 'for clip:', id);
      return;
    }
    
    setTimelineClips(prev => prev.map(clip => {
      if (clip.id !== id) return clip;
      const updates = applyResizeTrim(clip, newDuration, handle, deltaPosition, PIXELS_PER_SECOND);
      return { ...clip, ...updates };
    }));
  }, []);
  
  // 비디오 클립 위치 업데이트
  const handleUpdateVideoClipPosition = useCallback((id: string, newPosition: number) => {
    setTimelineClips(prev => prev.map(clip => 
      clip.id === id ? { ...clip, position: newPosition } : clip
    ));
    saveToHistory();
  }, [saveToHistory]);
  
  // 모든 비디오 클립 업데이트
  const handleUpdateAllVideoClips = useCallback((newClips: VideoClip[]) => {
    setTimelineClips(newClips);
    saveToHistory();
  }, [saveToHistory]);
  
  // 비디오 클립 재정렬
  const handleReorderVideoClips = useCallback((newClips: VideoClip[]) => {
    setTimelineClips(newClips);
  }, []);
  
  // 텍스트 클립 추가
  const handleAddTextClip = useCallback((textData: Partial<TextClip>) => {
    if (editingTextClip) {
      setTextClips(textClips.map(clip => 
        clip.id === editingTextClip.id 
          ? { 
              ...clip, 
              content: textData.content || clip.content,
              style: textData.style || clip.style,
              effect: textData.effect !== undefined ? textData.effect : clip.effect,
              // position과 duration은 명시적으로 전달되지 않으면 기존 값 유지
              position: textData.position !== undefined ? textData.position : clip.position,
              duration: textData.duration !== undefined ? textData.duration : clip.duration,
            } 
          : clip
      ));
      saveToHistory();
    } else {
      import('../_utils/timeline-utils').then(({ getTimelineEnd }) => {
        const duration = textData.duration || 200;
        const position = getTimelineEnd(textClips);
        
        const newTextClip: TextClip = {
          id: `text-${Date.now()}`,
          content: textData.content || '',
          duration: duration,
          position: textData.position || position,
          style: textData.style || {
            fontSize: 24,
            fontFamily: 'default',
            color: '#FFFFFF',
            alignment: 'center',
          },
          effect: textData.effect,
        };
        
        setTextClips([...textClips, newTextClip]);
        saveToHistory();
      });
    }
    setEditingTextClip(undefined);
  }, [editingTextClip, textClips, saveToHistory]);
  
  // 텍스트 클립 편집
  const handleEditTextClip = useCallback((clip: TextClip) => {
    setEditingTextClip(clip);
  }, []);
  
  // 텍스트 클립 삭제
  const handleDeleteTextClip = useCallback((id: string) => {
    setTextClips(prev => prev.filter(c => c.id !== id));
    saveToHistory();
  }, [saveToHistory]);
  
  // 텍스트 클립 복제
  const handleDuplicateTextClip = useCallback((id: string) => {
    const clip = textClips.find(c => c.id === id);
    if (!clip) return;
    
    const duplicatedClip = duplicateTextClip(clip, textClips);
    setTextClips([...textClips, duplicatedClip]);
    saveToHistory();
  }, [textClips, saveToHistory]);
  
  // 텍스트 클립 분할
  const handleSplitTextClip = useCallback((id: string, currentTime: number, pixelsPerSecond: number) => {
    const clip = textClips.find(c => c.id === id);
    if (!clip) return;
    
    const playheadPosition = currentTime * pixelsPerSecond;
    const result = splitTextClip(clip, playheadPosition);
    
    if (result) {
      const { firstClip, secondClip } = result;
      setTextClips(textClips.map(c => 
        c.id === id ? firstClip : c
      ).concat(secondClip));
      saveToHistory();
    }
  }, [textClips, saveToHistory]);
  
  // 텍스트 클립 리사이즈
  const handleResizeTextClip = useCallback((id: string, newDuration: number) => {
    setTextClips(textClips.map(clip => 
      clip.id === id ? { ...clip, duration: newDuration } : clip
    ));
  }, [textClips]);
  
  // 텍스트 클립 위치 업데이트
  const handleUpdateTextClipPosition = useCallback((id: string, newPosition: number) => {
    setTextClips(prev => prev.map(clip => 
      clip.id === id ? { ...clip, position: newPosition } : clip
    ));
    saveToHistory();
  }, [saveToHistory]);
  
  // 모든 텍스트 클립 업데이트
  const handleUpdateAllTextClips = useCallback((newClips: TextClip[]) => {
    setTextClips(newClips);
    saveToHistory();
  }, [saveToHistory]);
  
  // 텍스트 클립 재정렬
  const handleReorderTextClips = useCallback((newClips: TextClip[]) => {
    setTextClips(newClips);
  }, []);
  
  // 텍스트 위치 업데이트 (화면에서 드래그)
  const handleUpdateTextPosition = useCallback((id: string, x: number, y: number) => {
    setTextClips(prev => prev.map(clip => 
      clip.id === id 
        ? { ...clip, style: { ...clip.style, positionX: x, positionY: y } }
        : clip
    ));
    saveToHistory();
  }, [saveToHistory]);
  
  // 텍스트 크기 업데이트
  const handleUpdateTextSize = useCallback((id: string, fontSize: number, fontSizeRatio: number) => {
    setTextClips(prev => prev.map(clip => 
      clip.id === id 
        ? { ...clip, style: { ...clip.style, fontSize, fontSizeRatio } }
        : clip
    ));
    saveToHistory();
  }, [saveToHistory]);
  
  // 사운드 클립 추가
  const handleAddSoundClip = useCallback(async (soundData: Partial<SoundClip>) => {
    const newSoundClip: SoundClip = {
      id: `sound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: soundData.name || 'New Sound',
      duration: soundData.duration || 300,
      position: soundData.position ?? 0,
      volume: soundData.volume || 100,
      url: soundData.url,
      maxDuration: soundData.maxDuration,
      isAnalyzing: true, // Start analyzing
    };
    setSoundClips([...soundClips, newSoundClip]);
    saveToHistory();
    
    // Analyze audio file asynchronously if URL is provided
    if (newSoundClip.url) {
      try {
        const analysisResult = await analyzeAudioFile(newSoundClip.url);
        setSoundClips(prev => prev.map(clip => 
          clip.id === newSoundClip.id 
            ? { ...clip, waveformData: analysisResult.waveformData, isAnalyzing: false }
            : clip
        ));
      } catch (error) {
        console.error('Failed to analyze audio:', error);
        // Remove analyzing flag on error
        setSoundClips(prev => prev.map(clip => 
          clip.id === newSoundClip.id 
            ? { ...clip, isAnalyzing: false }
            : clip
        ));
      }
    }
  }, [soundClips, saveToHistory]);
  
  // 여러 사운드 클립 추가 (SoundLibraryModal에서 사용)
  const handleAddSoundClips = useCallback(async (sounds: { name: string; url: string; duration: number }[]) => {
    const { getTimelineEnd } = await import('../_utils/timeline-utils');
    
    // Get the end position of existing clips
    let currentPosition = getTimelineEnd(soundClips);
    
    // 여러 사운드를 한 번에 처리
    const newSoundClips = sounds.map((sound, index) => {
      const durationInPixels = Math.round(sound.duration * PIXELS_PER_SECOND);
      
      const newClip: SoundClip = {
        id: `sound-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        name: sound.name,
        url: sound.url,
        duration: durationInPixels,
        maxDuration: durationInPixels,
        position: currentPosition,
        volume: 100,
        isAnalyzing: true, // Start analyzing
      };
      
      // Update position for next clip
      currentPosition += durationInPixels;
      
      return newClip;
    });
    
    // Add all clips at once
    setSoundClips([...soundClips, ...newSoundClips]);
    saveToHistory();
    
    // Analyze audio files asynchronously
    newSoundClips.forEach(async (clip) => {
      if (clip.url) {
        try {
          const analysisResult = await analyzeAudioFile(clip.url);
          setSoundClips(prev => prev.map(c => 
            c.id === clip.id 
              ? { ...c, waveformData: analysisResult.waveformData, isAnalyzing: false }
              : c
          ));
        } catch (error) {
          console.error(`Failed to analyze audio for ${clip.name}:`, error);
          // Remove analyzing flag on error
          setSoundClips(prev => prev.map(c => 
            c.id === clip.id 
              ? { ...c, isAnalyzing: false }
              : c
          ));
        }
      }
    });
  }, [soundClips, saveToHistory]);
  
  // 사운드 클립 삭제
  const handleDeleteSoundClip = useCallback((id: string) => {
    setSoundClips(prev => prev.filter(c => c.id !== id));
    saveToHistory();
  }, [saveToHistory]);
  
  // 사운드 클립 복제
  const handleDuplicateSoundClip = useCallback((id: string) => {
    const clip = soundClips.find(c => c.id === id);
    if (!clip) return;
    
    const duplicatedClip = duplicateSoundClip(clip, soundClips);
    setSoundClips([...soundClips, duplicatedClip]);
    saveToHistory();
  }, [soundClips, saveToHistory]);
  
  // 사운드 클립 분할
  const handleSplitSoundClip = useCallback((id: string, currentTime: number, pixelsPerSecond: number) => {
    const clip = soundClips.find(c => c.id === id);
    if (!clip) return;
    
    const playheadPosition = currentTime * pixelsPerSecond;
    const result = splitSoundClip(clip, playheadPosition, pixelsPerSecond);
    
    if (result) {
      const { firstClip, secondClip } = result;
      setSoundClips(soundClips.map(c => 
        c.id === id ? firstClip : c
      ).concat(secondClip));
      saveToHistory();
    }
  }, [soundClips, saveToHistory]);
  
  // 사운드 클립 리사이즈
  const handleResizeSoundClip = useCallback((id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => {
    setSoundClips(prev => prev.map(clip => {
      if (clip.id !== id) return clip;
      const updates = applyResizeTrim(clip, newDuration, handle, deltaPosition, PIXELS_PER_SECOND);
      return { ...clip, ...updates };
    }));
  }, []);
  
  // 사운드 클립 위치 업데이트
  const handleUpdateSoundClipPosition = useCallback((id: string, newPosition: number) => {
    setSoundClips(prev => prev.map(clip => 
      clip.id === id ? { ...clip, position: newPosition } : clip
    ));
    saveToHistory();
  }, [saveToHistory]);
  
  // 모든 사운드 클립 업데이트
  const handleUpdateAllSoundClips = useCallback((newClips: SoundClip[]) => {
    setSoundClips(newClips);
    saveToHistory();
  }, [saveToHistory]);
  
  // 사운드 클립 재정렬
  const handleReorderSoundClips = useCallback((newClips: SoundClip[]) => {
    setSoundClips(newClips);
  }, []);
  
  // 사운드 클립 음량 업데이트
  const handleUpdateSoundVolume = useCallback((id: string, volume: number) => {
    setSoundClips(prev => prev.map(clip => 
      clip.id === id ? { ...clip, volume } : clip
    ));
    saveToHistory();
  }, [saveToHistory]);
  
  // 사운드 클립 페이드 업데이트
  const handleUpdateSoundFade = useCallback((id: string, fadeType: 'fadeIn' | 'fadeOut', duration: number) => {
    setSoundClips(prev => prev.map(clip => {
      if (clip.id !== id) return clip;
      
      if (fadeType === 'fadeIn') {
        return { ...clip, fadeInDuration: duration };
      } else {
        return { ...clip, fadeOutDuration: duration };
      }
    }));
    saveToHistory();
  }, [saveToHistory]);
  
  // Context value를 useMemo로 최적화
  const value = useMemo(() => ({
    // 상태
    timelineClips,
    textClips,
    soundClips,
    selectedTextClip,
    editingTextClip,
    hasUnsavedChanges,
    lastModifiedAt,
    
    // Setter 함수
    setTimelineClips,
    setTextClips,
    setSoundClips,
    setSelectedTextClip,
    setEditingTextClip,
    setHasUnsavedChanges,
    
    // 비디오 클립 함수
    handleAddToTimeline,
    handleDeleteVideoClip,
    handleDuplicateVideoClip,
    handleSplitVideoClip,
    handleResizeVideoClip,
    handleUpdateVideoClipPosition,
    handleUpdateAllVideoClips,
    handleReorderVideoClips,
    
    // 텍스트 클립 함수
    handleAddTextClip,
    handleEditTextClip,
    handleDeleteTextClip,
    handleDuplicateTextClip,
    handleSplitTextClip,
    handleResizeTextClip,
    handleUpdateTextClipPosition,
    handleUpdateAllTextClips,
    handleReorderTextClips,
    handleUpdateTextPosition,
    handleUpdateTextSize,
    
    // 사운드 클립 함수
    handleAddSoundClip,
    handleAddSoundClips,
    handleDeleteSoundClip,
    handleDuplicateSoundClip,
    handleSplitSoundClip,
    handleResizeSoundClip,
    handleUpdateSoundClipPosition,
    handleUpdateAllSoundClips,
    handleReorderSoundClips,
    handleUpdateSoundVolume,
    handleUpdateSoundFade,
    
    // 히스토리 저장 (나중에 연결)
    saveToHistory,
    setSaveToHistoryCallback,
  }), [
    timelineClips,
    textClips,
    soundClips,
    selectedTextClip,
    editingTextClip,
    hasUnsavedChanges,
    lastModifiedAt,
    handleAddToTimeline,
    handleDeleteVideoClip,
    handleDuplicateVideoClip,
    handleSplitVideoClip,
    handleResizeVideoClip,
    handleUpdateVideoClipPosition,
    handleUpdateAllVideoClips,
    handleReorderVideoClips,
    handleAddTextClip,
    handleEditTextClip,
    handleDeleteTextClip,
    handleDuplicateTextClip,
    handleSplitTextClip,
    handleResizeTextClip,
    handleUpdateTextClipPosition,
    handleUpdateAllTextClips,
    handleReorderTextClips,
    handleUpdateTextPosition,
    handleUpdateTextSize,
    handleAddSoundClip,
    handleAddSoundClips,
    handleDeleteSoundClip,
    handleDuplicateSoundClip,
    handleSplitSoundClip,
    handleResizeSoundClip,
    handleUpdateSoundClipPosition,
    handleUpdateAllSoundClips,
    handleReorderSoundClips,
    handleUpdateSoundVolume,
    handleUpdateSoundFade,
    saveToHistory,
    setSaveToHistoryCallback,
  ]);
  
  return (
    <ClipContext.Provider value={value}>
      {children}
    </ClipContext.Provider>
  );
}

export function useClips() {
  const context = useContext(ClipContext);
  if (!context) {
    throw new Error('useClips must be used within ClipProvider');
  }
  return context;
}