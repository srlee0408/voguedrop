/**
 * Image Brush 기능 관련 타입 정의
 */

/**
 * Image Brush 요청 타입
 */
export interface ImageBrushRequest {
  /** Base64 인코딩된 원본 이미지 */
  image: string;
  /** Base64 인코딩된 마스크 이미지 (흰색이 마스크 영역) */
  mask: string;
  /** AI 생성을 위한 프롬프트 */
  prompt: string;
  /** 처리 모드 - flux: FLUX Fill API, i2i: RunPod I2I */
  mode: 'flux' | 'i2i';
  /** 사용자 ID */
  userId?: string;
  /** Base64 인코딩된 참조 이미지 (I2I 모드용) */
  referenceImage?: string;
  /** 스타일 강도 (I2I 모드용, 0.5 ~ 1.5) */
  styleStrength?: number;
}

/**
 * Image Brush 응답 타입
 */
export interface ImageBrushResponse {
  /** 처리 성공 여부 */
  success: boolean;
  /** 처리된 이미지 URL (Supabase Storage) */
  imageUrl?: string;
  /** 원본 이미지 URL (디버깅용) */
  originalImageUrl?: string;
  /** 마스크 이미지 URL (디버깅용) */
  maskImageUrl?: string;
  /** 참조 이미지 URL (I2I 모드용) */
  referenceImageUrl?: string;
  /** 에러 메시지 */
  error?: string;
  /** 처리 시간 (ms) */
  processingTime?: number;
}

/**
 * 브러시 설정 타입
 */
export interface BrushSettings {
  /** 브러시 크기 (5 ~ 100px) */
  size: number;
  /** 브러시 불투명도 (0.1 ~ 1.0) */
  opacity: number;
  /** 브러시 경도 (0 ~ 1, 0은 부드러움, 1은 딱딱함) */
  hardness: number;
  /** 브러시 색상 (hex 형식, 예: #FF0000) */
  color: string;
}

/**
 * 브러시 도구 타입
 */
export type BrushTool = 'brush' | 'eraser' | 'clear';

/**
 * Image Brush 히스토리 항목
 */
export interface ImageBrushHistoryItem {
  /** 히스토리 항목 ID */
  id: string;
  /** 원본 이미지 URL */
  original: string;
  /** 브러시 처리된 이미지 URL */
  brushed: string;
  /** 사용된 프롬프트 */
  prompt: string;
  /** 생성 타임스탬프 */
  timestamp: number;
  /** 처리 모드 */
  mode: 'flux' | 'i2i';
}

/**
 * Image Brush 모달 상태
 */
export interface ImageBrushModalState {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 처리 중 상태 */
  isProcessing: boolean;
  /** 현재 선택된 도구 */
  currentTool: BrushTool;
  /** 브러시 설정 */
  brushSettings: BrushSettings;
  /** 입력된 프롬프트 */
  prompt: string;
  /** 처리 모드 */
  mode: 'flux' | 'i2i';
  /** 진행률 (0 ~ 100) */
  progress: number;
  /** 에러 메시지 */
  error: string | null;
  /** 참조 이미지 (I2I 모드용) */
  referenceImage?: string | null;
  /** 스타일 강도 (I2I 모드용) */
  styleStrength?: number;
}

/**
 * Canvas 마우스 이벤트 타입
 */
export interface CanvasMouseEvent {
  /** X 좌표 (Canvas 기준) */
  x: number;
  /** Y 좌표 (Canvas 기준) */
  y: number;
  /** 마우스 버튼 눌림 상태 */
  isDrawing: boolean;
}

/**
 * Image Brush 작업 결과
 */
export interface ImageBrushResult {
  /** 원본 이미지 URL */
  originalImage: string;
  /** 마스크 이미지 (Base64) */
  maskImage: string;
  /** 결과 이미지 URL */
  resultImage: string;
  /** 사용된 프롬프트 */
  prompt: string;
  /** 처리 시간 */
  processingTime: number;
  /** 생성 시각 */
  createdAt: Date;
}