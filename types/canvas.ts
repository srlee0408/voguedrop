export interface GeneratedVideo {
  id: string;  // job_id를 사용
  url: string;
  createdAt: Date;
  thumbnail?: string;
  modelType?: 'seedance' | 'hailo';
  isFavorite?: boolean;
}

export interface EffectTemplate {
  id: number;
  name: string;
  categoryId: number;
  prompt: string;
  previewUrl?: string;
  displayOrder: number;
}