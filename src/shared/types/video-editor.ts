export interface VideoClip {
  id: string;
  duration: number;
  position: number;
  thumbnails?: number;
  url?: string;
  thumbnail?: string;
  title?: string;
  maxDuration?: number; // Maximum duration in pixels (actual video length)
  startTime?: number; // Start time in seconds within the original video
  endTime?: number; // End time in seconds within the original video
  sourceType?: 'clip' | 'upload' | 'project'; // Source of the video (AI-generated clip, user upload, or project)
}

export interface TextClip {
  id: string;
  content: string;
  duration: number;
  position: number;
  style: TextStyle;
  effect?: TextEffect;
  maxDuration?: number; // For consistency, though text clips may not have a max duration
}

export interface SoundClip {
  id: string;
  name: string;
  duration: number;
  position: number;
  volume: number;
  url?: string;
  maxDuration?: number; // Maximum duration in pixels (actual audio length)
  startTime?: number; // Start time in seconds within the original audio
  endTime?: number; // End time in seconds within the original audio
  waveformData?: number[]; // Normalized waveform peak values (0-1)
  isAnalyzing?: boolean; // Whether the audio is currently being analyzed
  fadeInDuration?: number; // Fade in duration in pixels (0 = no fade)
  fadeOutDuration?: number; // Fade out duration in pixels (0 = no fade)
  fadeInType?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'; // Fade curve type
  fadeOutType?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'; // Fade curve type
  laneIndex?: number; // Sound lane index (0-4, for multi-lane sound tracks)
}

export interface TextStyle {
  fontSize: number;
  fontSizeRatio?: number; // 컨테이너 너비의 비율 (0.044 = 4.4%)
  fontFamily: string;
  color: string;
  alignment: 'left' | 'center' | 'right';
  fontWeight?: number; // 400 (normal), 700 (bold), 500 (medium)
  verticalPosition?: 'top' | 'middle' | 'bottom';
  positionX?: number; // 0-100 (%) 커스텀 위치
  positionY?: number; // 0-100 (%) 커스텀 위치
  backgroundColor?: string; // 배경색 (옵션)
  backgroundOpacity?: number; // 배경 투명도 0-1
}

export type TextEffect = 
  | 'none' 
  | 'pulse' 
  | 'bounce' 
  | 'gradient' 
  | 'fade' 
  | 'slide' 
  | 'typing' 
  | 'glow' 
  | 'wave' 
  | 'zoom'
  | 'shake'
  | 'spin'
  | 'flip'
  | 'elastic'
  | 'rubberband'
  | 'jello'
  | 'flash'
  | 'neon'
  | 'glitch'
  | 'shadow'
  | 'outline'
  | 'chrome'
  | 'rainbow'
  | 'fire'
  | 'ice';

export interface TimelineTrack {
  id: string;
  type: 'video' | 'text' | 'sound';
  label: string;
  clips: (VideoClip | TextClip | SoundClip)[];
}

export interface EditorState {
  videoClips: VideoClip[];
  textClips: TextClip[];
  soundClips: SoundClip[];
  selectedClip: string | null;
  playheadPosition: number;
  zoom: number;
}

export interface LibraryVideo {
  id: string;
  job_id: string;
  status: string;
  input_image_url: string;
  output_video_url: string;
  created_at: string;
  is_favorite: boolean;
  aspect_ratio?: string;
  selected_effects: Array<{
    id: number;
    name: string;
  }>;
}

// 프로젝트 저장 타입 추가
export interface LibraryProject {
  id: number;
  project_name: string;
  updated_at: string;
  latest_video_url?: string;  // project_saves에서 직접 가져옴
  thumbnail_url?: string;  // 프로젝트 썸네일 URL
  latest_render?: {
    render_id: string;
    output_url: string;
    thumbnail_url: string | null;
    status: string;
  };
  content_snapshot?: {
    aspect_ratio: string;
    duration_frames: number;
  };
}

// 사용자 업로드 영상 타입
export interface UserUploadedVideo {
  id: number;
  user_id: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  duration?: number;
  aspect_ratio?: string;
  thumbnail_url?: string;
  metadata?: Record<string, unknown>;
  uploaded_at: string;
  is_deleted?: boolean;
}

// 통합 라이브러리 아이템 타입
export type LibraryItem = 
  | { type: 'clip'; data: LibraryVideo }
  | { type: 'project'; data: LibraryProject }
  | { type: 'upload'; data: UserUploadedVideo };

/**
 * 클립보드에 복사된 클립 데이터
 * 키보드 단축키를 통한 복사/붙여넣기 기능에 사용됩니다.
 * 
 * @interface ClipboardData
 */
export interface ClipboardData {
  /** 복사된 클립의 타입 */
  type: 'video' | 'text' | 'sound';
  /** 복사된 클립 데이터 (타입에 따라 VideoClip, TextClip, SoundClip 중 하나) */
  clip: VideoClip | TextClip | SoundClip;
  /** 복사된 시점의 타임스탬프 (밀리초) */
  copiedAt: number;
}