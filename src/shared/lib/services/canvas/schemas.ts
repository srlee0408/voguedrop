import { z } from 'zod';

/**
 * 비디오 생성 요청 스키마
 */
export const generateVideoRequestSchema = z.object({
  imageUrl: z.string().min(1, '이미지 URL이 필요합니다.'),
  effectIds: z.array(z.string()).default([]),
  basePrompt: z.string().optional(),
  modelType: z.enum(['seedance', 'hailo']).optional(),
  duration: z.string().default('5').refine(val => {
    const num = parseInt(val);
    return num >= 1;
  }, 'Duration must be at least 1 second'),
});

/**
 * 효과 템플릿 스키마
 */
export const effectTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  prompt: z.string(),
});

/**
 * 비디오 생성 작업 결과 스키마
 */
export const videoGenerationJobSchema = z.object({
  jobId: z.string(),
  status: z.enum(['processing', 'failed']),
  error: z.string().optional(),
});

/**
 * 비디오 생성 응답 스키마
 */
export const generateVideoResponseSchema = z.object({
  success: z.boolean(),
  jobs: z.array(videoGenerationJobSchema),
  message: z.string(),
});

/**
 * fal.ai API 요청 페이로드 스키마
 */
export const falApiRequestSchema = z.object({
  prompt: z.string(),
  image_url: z.string(),
  duration: z.string().optional(),
  resolution: z.string().optional(),
  prompt_optimizer: z.boolean().optional(),
});

/**
 * 타입 추출
 */
export type GenerateVideoRequest = z.infer<typeof generateVideoRequestSchema>;
export type EffectTemplate = z.infer<typeof effectTemplateSchema>;
export type VideoGenerationJob = z.infer<typeof videoGenerationJobSchema>;
export type GenerateVideoResponse = z.infer<typeof generateVideoResponseSchema>;
export type FalApiRequest = z.infer<typeof falApiRequestSchema>;