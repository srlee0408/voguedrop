export interface VideoClip {
  id: string;
  duration: number;
  position: number;
  thumbnails?: number;
  url?: string;
  thumbnail?: string;
  title?: string;
  maxDuration?: number; // Maximum duration in pixels (actual video length)
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
}

export interface TextStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  alignment: 'left' | 'center' | 'right';
  fontWeight?: 'normal' | 'bold' | 'medium';
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
  | 'spin';

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