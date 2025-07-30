export interface GeneratedVideo {
  id: number;
  url: string;
  createdAt: Date;
  thumbnail?: string;
}

export interface EffectTemplate {
  id: number;
  name: string;
  categoryId: number;
  prompt: string;
  previewUrl?: string;
  displayOrder: number;
}