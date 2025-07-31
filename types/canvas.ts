export interface GeneratedVideo {
  id: number;
  url: string;
  createdAt: Date;
  thumbnail?: string;
  modelType?: 'seedance' | 'hailo';
}

export interface EffectTemplate {
  id: number;
  name: string;
  categoryId: number;
  prompt: string;
  previewUrl?: string;
  displayOrder: number;
}