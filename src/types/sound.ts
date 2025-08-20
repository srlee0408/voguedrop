export interface GeneratedSound {
  id: string;
  url: string;
  title?: string;
  prompt: string;
  duration: number;
  createdAt: Date;
}

export type SoundGenerationType = 'sound_effect' | 'music';

export interface SoundGenerationRequest {
  prompt: string;
  duration_seconds?: number;
  title?: string;
  generation_type?: SoundGenerationType;
}

export interface SoundGenerationResult {
  audioUrl: string;
  requestId?: string;
}

export interface SoundGenerationJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    audioUrl: string;
  };
  error?: string;
  createdAt: string;
}