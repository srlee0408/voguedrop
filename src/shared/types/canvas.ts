export interface GeneratedVideo {
  id: string;  // job_id를 사용
  url: string;
  createdAt: Date;
  thumbnail?: string;
  isFavorite?: boolean;
}

export interface EffectTemplate {
  id: string;
  name: string;
  categoryId: string;
  previewUrl?: string;
  displayOrder: number;
}