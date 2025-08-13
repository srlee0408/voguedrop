export interface GeneratedSound {
  id: string;
  url: string;
  title?: string;
  prompt: string;
  duration: number;
  createdAt: Date;
}

export interface SoundGenerationRequest {
  prompt: string;
  duration_seconds?: number;
  title?: string;
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