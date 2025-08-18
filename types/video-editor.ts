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
  selected_effects: Array<{
    id: number;
    name: string;
  }>;
}