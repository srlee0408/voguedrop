export interface VideoClip {
  id: string;
  duration: number;
  position: number;
  thumbnails: number;
  url?: string;
}

export interface TextClip {
  id: string;
  content: string;
  duration: number;
  position: number;
  style: TextStyle;
  effect?: TextEffect;
}

export interface SoundClip {
  id: string;
  name: string;
  duration: number;
  position: number;
  volume: number;
  url?: string;
}

export interface TextStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  alignment: 'left' | 'center' | 'right';
  fontWeight?: 'normal' | 'bold' | 'medium';
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