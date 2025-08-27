/**
 * Canvas Types - AI 영상 생성 캔버스 관련 타입 정의
 * 
 * 주요 역할:
 * 1. Canvas 페이지에서 사용되는 데이터 구조 타입 정의
 * 2. AI 영상 생성 결과 및 효과 템플릿 타입 관리
 * 3. 클라이언트 사이드 상태 관리용 인터페이스 제공
 * 4. API 응답과 UI 컴포넌트 간 데이터 전달 타입 지원
 * 
 * 핵심 특징:
 * - GeneratedVideo: AI 생성 영상의 메타데이터 및 URL 정보
 * - EffectTemplate: 사용자 선택 가능한 AI 효과 템플릿 정보
 * - 선택적 필드로 다양한 상황에서의 유연성 제공
 * - Date 객체와 string ID의 명확한 구분
 * 
 * 주의사항:
 * - GeneratedVideo.id는 job_id와 동일한 값 사용
 * - createdAt은 Date 객체로 정의되어 직렬화 주의
 * - 선택적 필드들은 런타임에서 존재 여부 체크 필요
 */
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