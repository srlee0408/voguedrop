import { z } from 'zod';

/**
 * 프로젝트 저장 요청 스키마
 */
export const saveProjectRequestSchema = z.object({
  projectId: z.string().uuid().optional(), // 기존 프로젝트 업데이트용 UUID
  projectName: z.string().min(1, '프로젝트 이름이 필요합니다.'),
  videoClips: z.array(z.unknown()).default([]),
  textClips: z.array(z.unknown()).default([]),
  soundClips: z.array(z.unknown()).default([]),
  videoLanes: z.array(z.number()).default([0]), // 비디오 레인 배열 (기본값: [0])
  textLanes: z.array(z.number()).default([0]), // 텍스트 레인 배열 (기본값: [0])
  soundLanes: z.array(z.number()).default([0]), // 사운드 레인 배열 (기본값: [0])
  aspectRatio: z.enum(['9:16', '1:1', '16:9']),
  durationInFrames: z.number().min(0, '영상 길이는 0 이상이어야 합니다.'),
  renderId: z.string().optional(),
  renderOutputUrl: z.string().optional(),
});

/**
 * 프로젝트 로드 요청 스키마
 */
export const loadProjectRequestSchema = z.object({
  projectName: z.string().optional(),
  projectId: z.string().min(1).optional(), // UUID 또는 8자리 단축 ID 허용
}).refine(data => data.projectName || data.projectId, {
  message: 'projectName 또는 projectId 둘 중 하나는 반드시 필요합니다.',
});

/**
 * 렌더링 요청 스키마
 */
export const renderRequestSchema = z.object({
  videoClips: z.array(z.unknown()).min(1, '최소 하나의 비디오 클립이 필요합니다.'),
  textClips: z.array(z.unknown()),
  soundClips: z.array(z.unknown()),
  videoLanes: z.array(z.number()).default([0]), // 비디오 레인 배열 (기본값: [0])
  textLanes: z.array(z.number()).default([0]), // 텍스트 레인 배열 (기본값: [0])
  soundLanes: z.array(z.number()).default([0]), // 사운드 레인 배열 (기본값: [0])
  aspectRatio: z.enum(['9:16', '1:1', '16:9'], {
    required_error: '화면 비율이 필요합니다.',
  }),
  durationInFrames: z.number().positive('영상 길이는 양수여야 합니다.').max(3600, '최대 2분까지 렌더링 가능합니다.'),
  projectName: z.string().optional(),
  contentHash: z.string().optional(),
  projectSaveId: z.number().optional(),
});

/**
 * 렌더링 상태 확인 요청 스키마
 */
export const renderStatusRequestSchema = z.object({
  renderId: z.string().min(1, 'Render ID가 필요합니다.'),
  bucketName: z.string().optional(),
});

/**
 * 프로젝트 저장 응답 스키마
 */
export const saveProjectResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  projectSaveId: z.string().uuid(), // number에서 string (UUID)로 변경
  needsRender: z.boolean(),
  videoUrl: z.string().nullable(),
  storageLocation: z.enum(['supabase', 's3']).nullable(),
});

/**
 * 프로젝트 로드 응답 스키마
 */
export const loadProjectResponseSchema = z.object({
  success: z.boolean(),
  project: z.object({
    id: z.string().uuid(), // number에서 string (UUID)로 변경
    project_name: z.string(),
    content_snapshot: z.object({
      version: z.string(),
      aspect_ratio: z.string(),
      duration_frames: z.number(),
      video_clips: z.array(z.unknown()),
      text_clips: z.array(z.unknown()),
      sound_clips: z.array(z.unknown()),
      video_lanes: z.array(z.number()).optional(), // 비디오 레인 배열 (옵션 - 하위 호환성)
      text_lanes: z.array(z.number()).optional(), // 텍스트 레인 배열 (옵션 - 하위 호환성)
      sound_lanes: z.array(z.number()).optional(), // 사운드 레인 배열 (옵션 - 하위 호환성)
      content_hash: z.string(),
    }),
    latest_render_id: z.string().nullable(),
    latest_video_url: z.string().nullable(),
    thumbnail_url: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
});

/**
 * 렌더링 시작 응답 스키마
 */
export const renderResponseSchema = z.object({
  success: z.boolean(),
  renderId: z.string(),
  bucketName: z.string(),
  status: z.string(),
  message: z.string(),
});

/**
 * 렌더링 상태 응답 스키마
 */
export const renderStatusResponseSchema = z.object({
  success: z.boolean(),
  done: z.boolean(),
  overallProgress: z.number(),
  outputFile: z.string().nullable(),
  errors: z.array(z.string()).optional(),
});

/**
 * 컨텐츠 스냅샷 스키마
 */
export const contentSnapshotSchema = z.object({
  version: z.string(),
  aspect_ratio: z.string(),
  duration_frames: z.number(),
  video_clips: z.array(z.unknown()),
  text_clips: z.array(z.unknown()),
  sound_clips: z.array(z.unknown()),
  video_lanes: z.array(z.number()).optional(), // 비디오 레인 배열 (옵션 - 하위 호환성)
  text_lanes: z.array(z.number()).optional(), // 텍스트 레인 배열 (옵션 - 하위 호환성)
  sound_lanes: z.array(z.number()).optional(), // 사운드 레인 배열 (옵션 - 하위 호환성)
  content_hash: z.string(),
});

/**
 * 타입 추출
 */
export type SaveProjectRequest = z.infer<typeof saveProjectRequestSchema>;
export type LoadProjectRequest = z.infer<typeof loadProjectRequestSchema>;
export type RenderRequest = z.infer<typeof renderRequestSchema>;
export type RenderStatusRequest = z.infer<typeof renderStatusRequestSchema>;
export type SaveProjectResponse = z.infer<typeof saveProjectResponseSchema>;
export type LoadProjectResponse = z.infer<typeof loadProjectResponseSchema>;
export type RenderResponse = z.infer<typeof renderResponseSchema>;
export type RenderStatusResponse = z.infer<typeof renderStatusResponseSchema>;
export type ContentSnapshot = z.infer<typeof contentSnapshotSchema>;