'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { VideoClip, TextClip, SoundClip, LibraryVideo, LibraryProject, UserUploadedVideo, LibraryItem, ClipboardData } from '@/shared/types/video-editor';
import { toast } from 'sonner';
import {
  duplicateTextClip,
  duplicateSoundClip,
  splitTextClip,
  splitSoundClip,
  applyResizeTrim,
} from '../_utils/clip-operations';
import { analyzeAudioFile } from '../_utils/audio-analysis';
import { calculateTimelineDuration } from '../_utils/common-clip-utils';
import {
  magneticPositioning,
  freePositioning,
  soundPositioning,
} from '../_utils/common-clip-utils';
import { 
  getUsedLanesFromClips,
  canAddNewLane, 
  getNextAvailableLane,
  validateLaneIndex,
  hasOverlapInLane,
  MAX_TEXT_LANES,
  MAX_VIDEO_LANES,
  canAddNewTextLane,
  canAddNewVideoLane,
  getNextAvailableTextLane,
  getNextAvailableVideoLane,
  validateTextLaneIndex,
  validateVideoLaneIndex
} from '../_utils/lane-arrangement';

/**
 * 클립 관리 Context의 타입 정의
 * 
 * 이 Context는 Video Editor의 핵심 기능인 클립 관리를 담당합니다.
 * 비디오 클립, 텍스트 클립, 사운드 클립의 생성, 수정, 삭제, 복제, 분할 등의
 * 모든 작업을 중앙 집중식으로 관리합니다.
 * 
 * @interface ClipContextType
 */
interface ClipContextType {
  // 상태
  /** 타임라인에 배치된 비디오 클립 배열 (위치와 길이 정보 포함) */
  timelineClips: VideoClip[];
  /** 화면에 오버레이되는 텍스트 클립 배열 (스타일과 위치 정보 포함) */
  textClips: TextClip[];
  /** 오디오 트랙에 배치된 사운드 클립 배열 (볼륨과 페이드 정보 포함) */
  soundClips: SoundClip[];
  /** 활성화된 사운드 레인 인덱스 배열 (0부터 시작, 최대 3개) */
  soundLanes: number[];
  /** 활성화된 텍스트 레인 인덱스 배열 (0부터 시작, 최대 3개) */
  textLanes: number[];
  /** 활성화된 비디오 레인 인덱스 배열 (0부터 시작, 최대 3개) */
  videoLanes: number[];
  /** 현재 선택된 텍스트 클립의 ID (null이면 선택 없음) */
  selectedTextClip: string | null;
  /** 프로젝트에 저장되지 않은 변경사항이 있는지 여부 */
  hasUnsavedChanges: boolean;
  /** 마지막으로 수정된 시간 (자동 저장 표시용) */
  lastModifiedAt: Date | null;
  
  // 클립 선택 상태 (키보드 단축키용)
  /** 현재 선택된 클립의 ID (null이면 선택 없음) */
  selectedClipId: string | null;
  /** 현재 선택된 클립의 타입 */
  selectedClipType: 'video' | 'text' | 'sound' | null;
  /** 다중 선택된 클립들의 배열 */
  multiSelectedClips: Array<{id: string, type: 'video' | 'text' | 'sound'}>;
  /** 클립보드에 복사된 클립 데이터 */
  clipboard: ClipboardData | null;
  
  // Setter 함수들
  setTimelineClips: React.Dispatch<React.SetStateAction<VideoClip[]>>;
  setTextClips: React.Dispatch<React.SetStateAction<TextClip[]>>;
  setSoundClips: React.Dispatch<React.SetStateAction<SoundClip[]>>;
  setSelectedTextClip: React.Dispatch<React.SetStateAction<string | null>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  
  // 비디오 클립 관련 함수
  handleAddToTimeline: (items: LibraryItem[]) => Promise<void>;
  handleDeleteVideoClip: (id: string) => Promise<void>;
  handleDuplicateVideoClip: (id: string) => Promise<void>;
  handleSplitVideoClip: (id: string, currentTime: number, pixelsPerSecond: number) => Promise<void>;
  handleResizeVideoClip: (id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => Promise<void>;
  handleUpdateVideoClipPosition: (id: string, newPosition: number) => Promise<void>;
  handleUpdateAllVideoClips: (newClips: VideoClip[]) => Promise<void>;
  handleReorderVideoClips: (newClips: VideoClip[]) => Promise<void>;
  
  // 텍스트 클립 관련 함수
  handleAddTextClip: (textData: Partial<TextClip>) => Promise<void>;
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
  handleAddSoundClips: (sounds: { name: string; url: string; duration: number; laneIndex?: number }[]) => Promise<void>;
  handleDeleteSoundClip: (id: string) => void;
  handleDuplicateSoundClip: (id: string) => void;
  handleSplitSoundClip: (id: string, currentTime: number, pixelsPerSecond: number) => void;
  handleResizeSoundClip: (id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => void;
  handleUpdateSoundClipPosition: (id: string, newPosition: number) => void;
  handleUpdateAllSoundClips: (newClips: SoundClip[]) => void;
  handleReorderSoundClips: (newClips: SoundClip[]) => void;
  handleUpdateSoundVolume: (id: string, volume: number) => void;
  handleUpdateSoundFade: (id: string, fadeType: 'fadeIn' | 'fadeOut', duration: number) => void;
  
  // 사운드 레인 관리 함수
  handleAddSoundLane: () => void;
  handleDeleteSoundLane: (laneIndex: number) => void;
  handleAddSoundToLane: (laneIndex: number) => void;
  handleUpdateSoundClipLane: (id: string, laneIndex: number) => void;
  
  // 텍스트 레인 관리 함수
  handleAddTextLane: () => void;
  handleDeleteTextLane: (laneIndex: number) => void;
  handleAddTextToLane: (laneIndex: number) => void;
  handleUpdateTextClipLane: (id: string, laneIndex: number) => void;
  
  // 비디오 레인 관리 함수
  handleAddVideoLane: () => void;
  handleDeleteVideoLane: (laneIndex: number) => void;
  handleAddVideoToLane: (laneIndex: number) => void;
  handleUpdateVideoClipLane: (id: string, laneIndex: number) => void;
  
  // 편집 상태
  editingTextClip?: TextClip;
  setEditingTextClip: React.Dispatch<React.SetStateAction<TextClip | undefined>>;
  
  // 클립 선택 관리 함수 (키보드 단축키용)
  /** 클립 선택 함수 */
  handleSelectClip: (id: string, type: 'video' | 'text' | 'sound') => void;
  /** 선택 해제 함수 */
  handleClearSelection: () => void;
  /** 다중 선택 업데이트 함수 */
  handleSetMultiSelectedClips: (clips: Array<{id: string, type: 'video' | 'text' | 'sound'}>) => void;
  /** 선택된 클립 삭제 함수 */
  handleDeleteSelectedClips: () => void;
  /** 선택된 클립 복제 함수 */
  handleDuplicateSelectedClip: () => void;
  /** 선택된 클립 복사 함수 */
  handleCopyClip: () => void;
  /** 클립 붙여넣기 함수 */
  handlePasteClip: (atTime: number) => void;
  
  // 히스토리 저장 콜백 (HistoryContext에서 주입)
  saveToHistory?: () => void;
  setSaveToHistoryCallback?: React.Dispatch<React.SetStateAction<(() => void) | null>>;
}

export const ClipContext = createContext<ClipContextType | undefined>(undefined);

/** 타임라인 스케일: 1초당 픽셀 수 (40px = 1초) */
const PIXELS_PER_SECOND = 40;
/** 최대 타임라인 길이: 2분 제한 */
const MAX_TIMELINE_DURATION_SECONDS = 120;

/**
 * ClipProvider 컴포넌트의 Props
 * @interface ClipProviderProps
 */
interface ClipProviderProps {
  /** 하위 컴포넌트들 */
  children: ReactNode;
}

/**
 * 클립 관리를 담당하는 Context Provider
 * 
 * 이 Provider는 Video Editor에서 사용되는 모든 클립(비디오, 텍스트, 사운드)의
 * 상태와 조작 함수를 제공합니다. 다음과 같은 주요 기능을 포함합니다:
 * 
 * **관리하는 상태:**
 * - 비디오 클립: 타임라인 상의 비디오 세그먼트들
 * - 텍스트 클립: 화면에 오버레이되는 텍스트 요소들  
 * - 사운드 클립: 오디오 트랙의 사운드 요소들
 * - 선택/편집 상태: 현재 작업 중인 클립 정보
 * - 변경사항 추적: 자동 저장을 위한 상태 관리
 * 
 * **제공하는 기능:**
 * - CRUD 작업: 클립 생성, 읽기, 수정, 삭제
 * - 고급 편집: 복제, 분할, 리사이즈, 위치 조정
 * - 타임라인 관리: 2분 제한, 충돌 감지, 자동 배치
 * - 프로젝트 연동: 저장/복원, 히스토리 관리
 * 
 * @param {ClipProviderProps} props - Provider 속성
 * @returns {React.ReactElement} Context Provider 컴포넌트
 * 
 * @example
 * ```tsx
 * function VideoEditor() {
 *   return (
 *     <ClipProvider>
 *       <Timeline />
 *       <PreviewSection />
 *     </ClipProvider>
 *   );
 * }
 * ```
 */
export function ClipProvider({ children }: ClipProviderProps) {
  // 상태 (page.tsx에서 그대로 가져옴)
  const [timelineClips, setTimelineClips] = useState<VideoClip[]>([]);
  const [textClips, setTextClips] = useState<TextClip[]>([]);
  const [soundClips, setSoundClips] = useState<SoundClip[]>([]);
  const [soundLanes, setSoundLanes] = useState<number[]>([0]); // 기본적으로 레인 0 활성화
  const [textLanes, setTextLanes] = useState<number[]>([0]); // 기본적으로 레인 0 활성화  
  const [videoLanes, setVideoLanes] = useState<number[]>([0]); // 기본적으로 레인 0 활성화
  const [selectedTextClip, setSelectedTextClip] = useState<string | null>(null);
  const [editingTextClip, setEditingTextClip] = useState<TextClip | undefined>(undefined);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastModifiedAt, setLastModifiedAt] = useState<Date | null>(null);
  
  // 키보드 단축키용 선택 상태
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedClipType, setSelectedClipType] = useState<'video' | 'text' | 'sound' | null>(null);
  const [multiSelectedClips, setMultiSelectedClips] = useState<Array<{id: string, type: 'video' | 'text' | 'sound'}>>([]);
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  
  
  // 사운드 레인 변경 시 ProjectContext에 이벤트 발송
  useEffect(() => {
    const event = new CustomEvent('soundLanesUpdated', {
      detail: { soundLanes }
    });
    window.dispatchEvent(event);
  }, [soundLanes]);
  
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
        laneIndex: clip.laneIndex ?? 0, // 하위 호환성을 위해 기본값 0 설정
      }));
      setTimelineClips(restoredVideoClips);
      
      // 저장된 videoLanes 복원 (있는 경우)
      if (contentSnapshot.video_lanes && Array.isArray(contentSnapshot.video_lanes)) {
        setVideoLanes(contentSnapshot.video_lanes);
      } else {
        // 클립들로부터 사용된 레인 추출
        const usedLanes = getUsedLanesFromClips(restoredVideoClips);
        setVideoLanes(usedLanes.length > 0 ? usedLanes : [0]);
      }
    }
    
    // 텍스트 클립 복원
    if (contentSnapshot.text_clips) {
      const restoredTextClips = contentSnapshot.text_clips.map((clip: TextClip) => ({
        ...clip,
        laneIndex: clip.laneIndex ?? 0, // 하위 호환성을 위해 기본값 0 설정
      }));
      setTextClips(restoredTextClips);
      
      // 저장된 textLanes 복원 (있는 경우)
      if (contentSnapshot.text_lanes && Array.isArray(contentSnapshot.text_lanes)) {
        setTextLanes(contentSnapshot.text_lanes);
      } else {
        // 클립들로부터 사용된 레인 추출
        const usedLanes = getUsedLanesFromClips(restoredTextClips);
        setTextLanes(usedLanes.length > 0 ? usedLanes : [0]);
      }
    }
    
    // 사운드 클립 복원
    if (contentSnapshot.sound_clips) {
      const restoredSoundClips = contentSnapshot.sound_clips.map((clip: SoundClip) => ({
        ...clip,
        isAnalyzing: !clip.waveformData, // waveformData가 없을 때만 분석 필요
        laneIndex: clip.laneIndex ?? 0, // 하위 호환성을 위해 기본값 0 설정
      }));
      
      setSoundClips(restoredSoundClips);
      
      // 저장된 soundLanes 복원 (있는 경우)
      if (contentSnapshot.sound_lanes && Array.isArray(contentSnapshot.sound_lanes)) {
        setSoundLanes(contentSnapshot.sound_lanes);
      } else {
        // 클립들로부터 사용된 레인 추출
        const usedLanes = getUsedLanesFromClips(restoredSoundClips);
        setSoundLanes(usedLanes.length > 0 ? usedLanes : [0]);
      }
      
      // 폴백: waveformData가 없는 클립만 재분석 (하위 호환성)
      restoredSoundClips.forEach(async (clip: SoundClip) => {
        if (clip.url && !clip.waveformData) {
          try {
            const analysisResult = await analyzeAudioFile(clip.url);
            setSoundClips(prev => prev.map(c => 
              c.id === clip.id 
                ? { ...c, waveformData: analysisResult.waveformData, isAnalyzing: false }
                : c
            ));
          } catch (error) {
            console.error('Failed to re-analyze audio:', error);
            setSoundClips(prev => prev.map(c => 
              c.id === clip.id ? { ...c, isAnalyzing: false } : c
            ));
          }
        }
      });
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
    const default_px = 240;
    const newClips: VideoClip[] = [];
    // 레인별 현재 끝 위치를 추적하여 다중 추가 시 겹치지 않도록 배치
    const laneEndPositions = new Map<number, number>();
    
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
        
      } else if (item.type === 'project') {
        const project = item.data as LibraryProject;
        // 프로젝트는 render_id 또는 project_id 사용
        clipId = `project-${project.id}-${Date.now()}-${index}`;
        url = project.latest_video_url || '';
        thumbnail = project.thumbnail_url || undefined; // 프로젝트 썸네일 사용
        title = project.project_name || 'Project';
        sourceType = 'project'; // Project-based video
        
        
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
        
        
        if (!url) {
          toast.error(`Upload "${title}" doesn't have a valid video URL`);
          continue;
        }
      }
      
      const targetLane = 'laneIndex' in item ? (item as LibraryItem & { laneIndex: number }).laneIndex : 0;
      
      // 해당 레인의 끝 위치를 1회 계산 후 맵에 저장, 이후 연속 배치 시 이전 값 사용
      const { getTimelineEnd } = await import('../_utils/common-clip-utils');
      if (!laneEndPositions.has(targetLane)) {
        const sameLaneVideoClips = timelineClips.filter(c => (c.laneIndex ?? 0) === targetLane);
        laneEndPositions.set(targetLane, getTimelineEnd(sameLaneVideoClips));
      }
      const currentPosition = laneEndPositions.get(targetLane) ?? 0;
      
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
        laneIndex: targetLane, // laneIndex 추가
      };
      
      newClips.push(newClip);
      // 다음 아이템이 같은 레인일 경우를 위해 끝 위치 갱신
      laneEndPositions.set(targetLane, currentPosition + default_px);
      
      // 백그라운드에서 실제 duration 계산
      getVideoDurationSeconds(url).then((duration_seconds) => {
        const min_px = 80;
        const computed_px = Math.max(min_px, Math.round((duration_seconds || 0) * PIXELS_PER_SECOND));
        
        setTimelineClips(prev => {
          const target = prev.find(c => c.id === clipId);
          if (!target) return prev;
          const lane = target.laneIndex ?? 0;
          const oldDuration = target.duration;
          const durationDiff = computed_px - oldDuration;
          const targetRight = target.position + oldDuration;

          return prev.map(c => {
            if (c.id === clipId) {
              return { ...c, duration: computed_px, maxDuration: computed_px };
            }
            // 같은 레인에서, 대상 클립의 기존 끝 이후에 오는 클립들만 밀어줌
            if ((c.laneIndex ?? 0) === lane && c.position >= targetRight) {
              return { ...c, position: c.position + durationDiff };
            }
            return c;
          });
        });
      });
    }
    
    setTimelineClips(prev => [...prev, ...newClips]);
    saveToHistory();
  }, [timelineClips, extractTitleFromUrl, getVideoDurationSeconds, saveToHistory]);
  
  // 비디오 클립 삭제
  const handleDeleteVideoClip = useCallback(async (id: string) => {
    const { CommonClipManager } = await import('../_utils/common-clip-manager');
    CommonClipManager.deleteClip(id, timelineClips, setTimelineClips, saveToHistory);
  }, [timelineClips, saveToHistory]);
  
  // 비디오 클립 복제
  const handleDuplicateVideoClip = useCallback(async (id: string) => {
    const { CommonClipManager } = await import('../_utils/common-clip-manager');
    CommonClipManager.duplicateClip(id, timelineClips, setTimelineClips, saveToHistory);
  }, [timelineClips, saveToHistory]);
  
  // 비디오 클립 분할
  const handleSplitVideoClip = useCallback(async (id: string, currentTime: number, pixelsPerSecond: number) => {
    const { CommonClipManager } = await import('../_utils/common-clip-manager');
    CommonClipManager.splitClip(id, currentTime, pixelsPerSecond, timelineClips, setTimelineClips, saveToHistory);
  }, [timelineClips, saveToHistory]);
  
  // 비디오 클립 리사이즈
  const handleResizeVideoClip = useCallback(async (id: string, newDuration: number, handle?: 'left' | 'right', deltaPosition?: number) => {
    if (newDuration <= 0) {
      console.error('[ClipContext] Invalid newDuration:', newDuration, 'for clip:', id);
      return;
    }
    
    const { CommonClipManager } = await import('../_utils/common-clip-manager');
    CommonClipManager.resizeClip(id, newDuration, timelineClips, setTimelineClips, handle, deltaPosition, saveToHistory);
  }, [timelineClips, saveToHistory]);
  
  // 비디오 클립 위치 업데이트
  const handleUpdateVideoClipPosition = useCallback(async (id: string, newPosition: number) => {
    const { CommonClipManager } = await import('../_utils/common-clip-manager');
    CommonClipManager.updateClipPosition(id, newPosition, timelineClips, setTimelineClips, saveToHistory);
  }, [timelineClips, saveToHistory]);
  
  // 모든 비디오 클립 업데이트
  const handleUpdateAllVideoClips = useCallback(async (newClips: VideoClip[]) => {
    const { CommonClipManager } = await import('../_utils/common-clip-manager');
    CommonClipManager.updateAllClips(newClips, setTimelineClips, saveToHistory);
  }, [saveToHistory]);
  
  // 비디오 클립 재정렬
  const handleReorderVideoClips = useCallback(async (newClips: VideoClip[]) => {
    const { CommonClipManager } = await import('../_utils/common-clip-manager');
    CommonClipManager.reorderClips(newClips, setTimelineClips);
  }, []);
  
  // 텍스트 클립 추가
  const handleAddTextClip = useCallback(async (textData: Partial<TextClip>) => {
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
              laneIndex: textData.laneIndex !== undefined ? textData.laneIndex : clip.laneIndex, // laneIndex 업데이트
            } 
          : clip
      ));
      saveToHistory();
    } else {
      const duration = textData.duration || 200;
      const targetLane = textData.laneIndex || 0;
      
      // 해당 레인의 기존 텍스트 클립들 중 가장 뒤에 배치
      let position = textData.position;
      if (position === undefined) {
        const { getTimelineEnd } = await import('../_utils/common-clip-utils');
        // 해당 레인의 텍스트 클립들만 필터링하여 끝 위치 계산
        const sameLaneTextClips = textClips.filter(c => (c.laneIndex ?? 0) === targetLane);
        position = getTimelineEnd(sameLaneTextClips);
      }
      
      const newTextClip: TextClip = {
        id: `text-${Date.now()}`,
        content: textData.content || '',
        duration: duration,
        position: position,
        style: textData.style || {
          fontSize: 24,
          fontFamily: 'default',
          color: '#FFFFFF',
          alignment: 'center',
        },
        effect: textData.effect,
        laneIndex: targetLane, // laneIndex 추가
      };
      
      setTextClips([...textClips, newTextClip]);
      saveToHistory();
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
      laneIndex: soundData.laneIndex ?? 0, // 기본적으로 레인 0에 추가
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
  const handleAddSoundClips = useCallback(async (sounds: { name: string; url: string; duration: number; laneIndex?: number }[]) => {
    const { getTimelineEnd } = await import('../_utils/common-clip-utils');
    
    // 레인별로 끝 위치를 별도로 계산하기 위한 Map
    const laneEndPositions = new Map<number, number>();
    
    // 여러 사운드를 한 번에 처리
    const newSoundClips = sounds.map((sound, index) => {
      const durationInPixels = Math.round(sound.duration * PIXELS_PER_SECOND);
      const targetLane = sound.laneIndex ?? 0;
      
      // 해당 레인의 현재 끝 위치 계산 (첫 번째 계산이면 기존 클립들을 확인)
      if (!laneEndPositions.has(targetLane)) {
        // 해당 레인에 있는 기존 클립들만 필터링해서 끝 위치 계산
        const laneClips = soundClips.filter(clip => (clip.laneIndex ?? 0) === targetLane);
        const laneEndPosition = getTimelineEnd(laneClips);
        laneEndPositions.set(targetLane, laneEndPosition);
      }
      
      const currentPosition = laneEndPositions.get(targetLane)!;
      
      const newClip: SoundClip = {
        id: `sound-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        name: sound.name,
        url: sound.url,
        duration: durationInPixels,
        maxDuration: durationInPixels,
        position: currentPosition,
        volume: 100,
        isAnalyzing: true, // Start analyzing
        laneIndex: targetLane,
      };
      
      // 해당 레인의 끝 위치 업데이트 (같은 레인에 여러 클립 추가 시)
      laneEndPositions.set(targetLane, currentPosition + durationInPixels);
      
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
  
  // 사운드 레인 추가
  const handleAddSoundLane = useCallback(() => {
    if (canAddNewLane(soundLanes)) {
      const nextLane = getNextAvailableLane(soundLanes);
      if (nextLane !== null) {
        setSoundLanes(prev => [...prev, nextLane].sort((a, b) => a - b));
        saveToHistory();
      }
    } else {
      toast.warning('Maximum 5 sound lanes allowed');
    }
  }, [soundLanes, saveToHistory]);
  
  // 사운드 레인 삭제
  const handleDeleteSoundLane = useCallback((laneIndex: number) => {
    // 레인 0은 삭제할 수 없음 (기본 레인)
    if (laneIndex === 0) {
      toast.warning('Cannot delete the main sound lane');
      return;
    }
    
    // 레인이 존재하는지 확인
    if (!soundLanes.includes(laneIndex)) {
      toast.error(`Lane ${laneIndex + 1} does not exist`);
      return;
    }
    
    // 해당 레인에 있는 모든 클립 삭제
    const laneClips = soundClips.filter(clip => (clip.laneIndex ?? 0) === laneIndex);
    if (laneClips.length > 0) {
      setSoundClips(prev => prev.filter(clip => (clip.laneIndex ?? 0) !== laneIndex));
      toast.info(`Deleted ${laneClips.length} sound clip(s) from lane ${laneIndex + 1}`);
    }
    
    // 레인 삭제
    setSoundLanes(prev => prev.filter(lane => lane !== laneIndex));
    saveToHistory();
    toast.success(`Lane ${laneIndex + 1} deleted`);
  }, [soundLanes, soundClips, saveToHistory]);
  
  // 특정 레인에 사운드 추가
  const handleAddSoundToLane = useCallback((laneIndex: number) => {
    const validLaneIndex = validateLaneIndex(laneIndex);
    
    // SoundLibraryModal을 열기 위한 이벤트 발생
    // 이벤트를 통해 laneIndex 정보를 전달
    const event = new CustomEvent('openSoundLibrary', {
      detail: { targetLaneIndex: validLaneIndex }
    });
    window.dispatchEvent(event);
  }, []);
  
  // 사운드 클립 레인 변경
  const handleUpdateSoundClipLane = useCallback((id: string, laneIndex: number) => {
    const validLaneIndex = validateLaneIndex(laneIndex);
    
    setSoundClips(prev => {
      const clipToMove = prev.find(clip => clip.id === id);
      if (!clipToMove) return prev;
      
      // 겹침 검사
      const updatedClip = { ...clipToMove, laneIndex: validLaneIndex };
      const otherClips = prev.filter(clip => clip.id !== id);
      
      if (hasOverlapInLane(updatedClip, validLaneIndex, otherClips)) {
        toast.warning('Cannot move clip to this lane due to overlap');
        return prev;
      }
      
      return prev.map(clip => 
        clip.id === id ? updatedClip : clip
      );
    });
    saveToHistory();
  }, [saveToHistory]);
  
  // ===============================
  // 텍스트 레인 관리 함수들
  // ===============================
  
  // 텍스트 레인 추가
  const handleAddTextLane = useCallback(() => {
    if (canAddNewTextLane(textLanes)) {
      const nextLane = getNextAvailableTextLane(textLanes);
      if (nextLane !== null) {
        setTextLanes(prev => [...prev, nextLane].sort((a, b) => a - b));
        saveToHistory();
        toast.success(`Text Lane ${nextLane + 1} added`);
      }
    } else {
      toast.warning(`Maximum ${MAX_TEXT_LANES} text lanes allowed`);
    }
  }, [textLanes, saveToHistory]);
  
  // 텍스트 레인 삭제
  const handleDeleteTextLane = useCallback((laneIndex: number) => {
    // 첫 번째 레인은 삭제 불가
    if (laneIndex === 0) {
      toast.warning('Cannot delete the main text lane');
      return;
    }
    
    // 레인이 존재하는지 확인
    if (!textLanes.includes(laneIndex)) {
      toast.error(`Lane ${laneIndex + 1} does not exist`);
      return;
    }
    
    // 해당 레인에 있는 모든 클립 삭제
    const laneClips = textClips.filter(clip => (clip.laneIndex ?? 0) === laneIndex);
    if (laneClips.length > 0) {
      setTextClips(prev => prev.filter(clip => (clip.laneIndex ?? 0) !== laneIndex));
      toast.info(`Deleted ${laneClips.length} text clip(s) from lane ${laneIndex + 1}`);
    }
    
    // 레인 삭제
    setTextLanes(prev => prev.filter(lane => lane !== laneIndex));
    saveToHistory();
    toast.success(`Text Lane ${laneIndex + 1} deleted`);
  }, [textLanes, textClips, saveToHistory]);
  
  // 특정 텍스트 레인에 텍스트 추가
  const handleAddTextToLane = useCallback((laneIndex: number) => {
    const validLaneIndex = validateTextLaneIndex(laneIndex);
    
    // TextLibraryModal을 열기 위한 이벤트 발생
    // 이벤트를 통해 laneIndex 정보를 전달
    const event = new CustomEvent('openTextLibrary', {
      detail: { targetLaneIndex: validLaneIndex }
    });
    window.dispatchEvent(event);
  }, []);
  
  // 텍스트 클립 레인 변경
  const handleUpdateTextClipLane = useCallback((id: string, laneIndex: number) => {
    setTextClips(prev => prev.map(clip => 
      clip.id === id ? { ...clip, laneIndex } : clip
    ));
    saveToHistory();
  }, [saveToHistory]);
  
  // ===============================
  // 비디오 레인 관리 함수들
  // ===============================
  
  // 비디오 레인 추가 (하위 레이어로 추가)
  const handleAddVideoLane = useCallback(() => {
    if (canAddNewVideoLane(videoLanes)) {
      const nextLane = getNextAvailableVideoLane(videoLanes);
      if (nextLane !== null) {
        setVideoLanes(prev => [...prev, nextLane].sort((a, b) => a - b));
        saveToHistory();
        toast.success(`Video Lane ${nextLane + 1} added`);
      }
    } else {
      toast.warning(`Maximum ${MAX_VIDEO_LANES} video lanes allowed`);
    }
  }, [videoLanes, saveToHistory]);
  
  // 비디오 레인 삭제
  const handleDeleteVideoLane = useCallback((laneIndex: number) => {
    // 첫 번째 레인은 삭제 불가
    if (laneIndex === 0) {
      toast.warning('Cannot delete the main video lane');
      return;
    }
    
    // 레인이 존재하는지 확인
    if (!videoLanes.includes(laneIndex)) {
      toast.error(`Lane ${laneIndex + 1} does not exist`);
      return;
    }
    
    // 해당 레인에 있는 모든 클립 삭제
    const laneClips = timelineClips.filter(clip => (clip.laneIndex ?? 0) === laneIndex);
    if (laneClips.length > 0) {
      setTimelineClips(prev => prev.filter(clip => (clip.laneIndex ?? 0) !== laneIndex));
      toast.info(`Deleted ${laneClips.length} video clip(s) from lane ${laneIndex + 1}`);
    }
    
    // 레인 삭제
    setVideoLanes(prev => prev.filter(lane => lane !== laneIndex));
    saveToHistory();
    toast.success(`Video Lane ${laneIndex + 1} deleted`);
  }, [videoLanes, timelineClips, saveToHistory]);
  
  // 특정 비디오 레인에 비디오 추가
  const handleAddVideoToLane = useCallback((laneIndex: number) => {
    const validLaneIndex = validateVideoLaneIndex(laneIndex);
    
    // VideoLibraryModal을 열기 위한 이벤트 발생
    // 이벤트를 통해 laneIndex 정보를 전달
    const event = new CustomEvent('openVideoLibrary', {
      detail: { targetLaneIndex: validLaneIndex }
    });
    window.dispatchEvent(event);
  }, []);
  
  // 비디오 클립 레인 변경
  const handleUpdateVideoClipLane = useCallback((id: string, laneIndex: number) => {
    setTimelineClips(prev => prev.map(clip => 
      clip.id === id ? { ...clip, laneIndex } : clip
    ));
    saveToHistory();
  }, [saveToHistory]);
  
  // 클립 선택 관리 함수들 (키보드 단축키용)
  
  /** 클립 선택 함수 - 단일 클립을 선택하고 다중 선택을 초기화 */
  const handleSelectClip = useCallback((id: string, type: 'video' | 'text' | 'sound') => {
    setSelectedClipId(id);
    setSelectedClipType(type);
    setMultiSelectedClips([]); // 단일 선택 시 다중 선택 해제
  }, []);
  
  /** 선택 해제 함수 - 모든 선택을 초기화 */
  const handleClearSelection = useCallback(() => {
    setSelectedClipId(null);
    setSelectedClipType(null);
    setMultiSelectedClips([]);
  }, []);
  
  /** 다중 선택 업데이트 함수 - 드래그 선택 결과를 Context에 반영 */
  const handleSetMultiSelectedClips = useCallback((clips: Array<{id: string, type: 'video' | 'text' | 'sound'}>) => {
    setMultiSelectedClips(clips);
    // 다중 선택 시 단일 선택 상태 초기화
    if (clips.length > 0) {
      setSelectedClipId(null);
      setSelectedClipType(null);
    }
  }, []);
  
  /** 선택된 클립 삭제 함수 - 현재 선택된 클립(들)을 삭제 */
  const handleDeleteSelectedClips = useCallback(() => {
    if (multiSelectedClips.length > 0) {
      // 다중 선택된 클립들 삭제
      multiSelectedClips.forEach(({ id, type }) => {
        if (type === 'video') {
          handleDeleteVideoClip(id);
        } else if (type === 'text') {
          handleDeleteTextClip(id);
        } else if (type === 'sound') {
          handleDeleteSoundClip(id);
        }
      });
      setMultiSelectedClips([]);
    } else if (selectedClipId && selectedClipType) {
      // 단일 선택된 클립 삭제
      if (selectedClipType === 'video') {
        handleDeleteVideoClip(selectedClipId);
      } else if (selectedClipType === 'text') {
        handleDeleteTextClip(selectedClipId);
      } else if (selectedClipType === 'sound') {
        handleDeleteSoundClip(selectedClipId);
      }
      handleClearSelection();
    }
    saveToHistory();
  }, [
    selectedClipId, 
    selectedClipType, 
    multiSelectedClips, 
    handleDeleteVideoClip, 
    handleDeleteTextClip, 
    handleDeleteSoundClip, 
    handleClearSelection, 
    saveToHistory
  ]);
  
  /** 선택된 클립 복제 함수 - 현재 선택된 클립을 복제 */
  const handleDuplicateSelectedClip = useCallback(() => {
    if (!selectedClipId || !selectedClipType) return;
    
    if (selectedClipType === 'video') {
      handleDuplicateVideoClip(selectedClipId);
    } else if (selectedClipType === 'text') {
      handleDuplicateTextClip(selectedClipId);
    } else if (selectedClipType === 'sound') {
      handleDuplicateSoundClip(selectedClipId);
    }
    saveToHistory();
  }, [
    selectedClipId, 
    selectedClipType, 
    handleDuplicateVideoClip, 
    handleDuplicateTextClip, 
    handleDuplicateSoundClip, 
    saveToHistory
  ]);
  
  /** 선택된 클립 복사 함수 - 클립보드에 복사 */
  const handleCopyClip = useCallback(() => {
    if (!selectedClipId || !selectedClipType) return;
    
    let clipToCopy: VideoClip | TextClip | SoundClip | undefined;
    
    if (selectedClipType === 'video') {
      clipToCopy = timelineClips.find(clip => clip.id === selectedClipId);
    } else if (selectedClipType === 'text') {
      clipToCopy = textClips.find(clip => clip.id === selectedClipId);
    } else if (selectedClipType === 'sound') {
      clipToCopy = soundClips.find(clip => clip.id === selectedClipId);
    }
    
    if (clipToCopy) {
      setClipboard({
        type: selectedClipType,
        clip: clipToCopy,
        copiedAt: Date.now()
      });
      toast.success('Clip copied to clipboard');
    }
  }, [selectedClipId, selectedClipType, timelineClips, textClips, soundClips]);
  
  /** 클립 붙여넣기 함수 - 지정된 시간에 클립보드의 클립을 붙여넣기 */
  const handlePasteClip = useCallback(async (atTime: number) => {
    if (!clipboard) {
      toast.error('No clip in clipboard');
      return;
    }
    
    // 클립보드 만료 체크 (10분)
    const clipboardAge = Date.now() - clipboard.copiedAt;
    if (clipboardAge > 10 * 60 * 1000) {
      setClipboard(null);
      toast.error('Clipboard expired');
      return;
    }
    
    const requestedPosition = Math.round(atTime * PIXELS_PER_SECOND);
    const newId = `${clipboard.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (clipboard.type === 'video') {
      const originalClip = clipboard.clip as VideoClip;
      
      // magneticPositioning을 사용하여 겹치지 않는 위치 찾기
      const { targetPosition, adjustedClips } = magneticPositioning(
        timelineClips,
        '', // 새 클립이므로 빈 ID
        requestedPosition,
        originalClip.duration
      );
      
      const newClip: VideoClip = {
        ...originalClip,
        id: newId,
        position: targetPosition,
      };
      
      // 조정된 클립들과 새 클립을 함께 적용
      const allClips = [...adjustedClips, newClip].sort((a, b) => a.position - b.position);
      setTimelineClips(allClips);
      
    } else if (clipboard.type === 'text') {
      const originalClip = clipboard.clip as TextClip;
      
      // freePositioning을 사용하여 겹치지 않는 위치 찾기
      const targetPosition = freePositioning(
        textClips,
        '', // 새 클립이므로 빈 ID
        requestedPosition,
        originalClip.duration
      );
      
      const newClip: TextClip = {
        ...originalClip,
        id: newId,
        position: targetPosition,
      };
      setTextClips(prev => [...prev, newClip]);
      
    } else if (clipboard.type === 'sound') {
      const originalClip = clipboard.clip as SoundClip;
      const targetLaneIndex = originalClip.laneIndex ?? 0;
      
      // 붙여넣을 레인의 클립들만 필터링하여 위치 계산
      const laneClips = soundClips.filter(clip => (clip.laneIndex ?? 0) === targetLaneIndex);
      
      // soundPositioning을 사용하여 겹치지 않는 위치 찾기
      const { targetPosition, adjustedClips } = soundPositioning(
        laneClips,
        '', // 새 클립이므로 빈 ID
        requestedPosition,
        originalClip.duration
      );
      
      const newClip: SoundClip = {
        ...originalClip,
        id: newId,
        position: targetPosition,
      };
      
      // 조정된 클립들과 새 클립을 함께 적용 (해당 레인만)
      const otherLaneClips = soundClips.filter(clip => (clip.laneIndex ?? 0) !== targetLaneIndex);
      const updatedLaneClips = [...adjustedClips, newClip];
      const allClips = [...otherLaneClips, ...updatedLaneClips].sort((a, b) => a.position - b.position);
      setSoundClips(allClips);
    }
    
    saveToHistory();
    toast.success('Clip pasted successfully');
  }, [clipboard, timelineClips, textClips, soundClips, saveToHistory]);
  
  // Context value를 useMemo로 최적화
  const value = useMemo(() => ({
    // 상태
    timelineClips,
    textClips,
    soundClips,
    soundLanes,
    textLanes,
    videoLanes,
    selectedTextClip,
    editingTextClip,
    hasUnsavedChanges,
    lastModifiedAt,
    
    // 선택 상태 (키보드 단축키용)
    selectedClipId,
    selectedClipType,
    multiSelectedClips,
    clipboard,
    
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
    
    // 사운드 레인 관리 함수
    handleAddSoundLane,
    handleDeleteSoundLane,
    handleAddSoundToLane,
    handleUpdateSoundClipLane,
    
    // 텍스트 레인 관리 함수
    handleAddTextLane,
    handleDeleteTextLane,
    handleAddTextToLane,
    handleUpdateTextClipLane,
    
    // 비디오 레인 관리 함수
    handleAddVideoLane,
    handleDeleteVideoLane,
    handleAddVideoToLane,
    handleUpdateVideoClipLane,
    
    // 클립 선택 관리 (키보드 단축키용)
    handleSelectClip,
    handleClearSelection,
    handleSetMultiSelectedClips,
    handleDeleteSelectedClips,
    handleDuplicateSelectedClip,
    handleCopyClip,
    handlePasteClip,
    
    // 히스토리 저장 (나중에 연결)
    saveToHistory,
    setSaveToHistoryCallback,
  }), [
    timelineClips,
    textClips,
    soundClips,
    soundLanes,
    textLanes,
    videoLanes,
    selectedTextClip,
    editingTextClip,
    hasUnsavedChanges,
    lastModifiedAt,
    selectedClipId,
    selectedClipType,
    multiSelectedClips,
    clipboard,
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
    handleAddSoundLane,
    handleDeleteSoundLane,
    handleAddSoundToLane,
    handleUpdateSoundClipLane,
    handleAddTextLane,
    handleDeleteTextLane,
    handleAddTextToLane,
    handleUpdateTextClipLane,
    handleAddVideoLane,
    handleDeleteVideoLane,
    handleAddVideoToLane,
    handleUpdateVideoClipLane,
    handleSelectClip,
    handleClearSelection,
    handleSetMultiSelectedClips,
    handleDeleteSelectedClips,
    handleDuplicateSelectedClip,
    handleCopyClip,
    handlePasteClip,
    saveToHistory,
    setSaveToHistoryCallback,
  ]);
  
  return (
    <ClipContext.Provider value={value}>
      {children}
    </ClipContext.Provider>
  );
}

/**
 * 클립 관리 Context를 사용하는 훅
 * 
 * 이 훅을 통해 비디오, 텍스트, 사운드 클립의 상태와 조작 함수에 접근할 수 있습니다.
 * ClipProvider 내부에서만 사용 가능하며, 다음과 같은 기능을 제공합니다:
 * 
 * - 클립 상태 접근: timelineClips, textClips, soundClips
 * - 클립 조작: 추가, 삭제, 복제, 분할, 리사이즈
 * - 편집 상태: 선택된 클립, 편집 중인 클립
 * - 히스토리 연동: 변경사항 저장, 실행 취소/다시 실행
 * 
 * @returns {ClipContextType} 클립 관리 상태와 함수들
 * @throws {Error} ClipProvider 없이 사용할 경우 에러 발생
 * 
 * @example
 * ```tsx
 * function Timeline() {
 *   const { timelineClips, handleAddToTimeline, handleDeleteVideoClip } = useClips();
 *   
 *   const addVideo = (video: LibraryVideo) => {
 *     handleAddToTimeline([{ type: 'clip', data: video }]);
 *   };
 *   
 *   return (
 *     <div>
 *       {timelineClips.map(clip => (
 *         <VideoClipComponent 
 *           key={clip.id} 
 *           clip={clip}
 *           onDelete={() => handleDeleteVideoClip(clip.id)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useClips() {
  const context = useContext(ClipContext);
  if (!context) {
    throw new Error('useClips must be used within ClipProvider');
  }
  return context;
}