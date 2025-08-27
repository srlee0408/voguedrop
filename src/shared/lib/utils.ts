/**
 * Utils - 공통 유틸리티 함수 모음
 * 
 * 주요 역할:
 * 1. Tailwind CSS 클래스 병합을 위한 cn 함수 제공
 * 2. UUID와 단축 ID 간 변환 유틸리티
 * 3. 데이터베이스 쿼리를 위한 패턴 생성
 * 4. 프로젝트 전반에서 재사용되는 공통 함수들
 * 
 * 핵심 특징:
 * - clsx와 tailwind-merge 조합으로 조건부 클래스 최적화
 * - UUID를 사용자 친화적인 8자리 ID로 단축
 * - 단축 ID로 UUID 검색을 위한 LIKE 패턴 생성
 * - 타입 안전성을 위한 ClassValue 타입 지원
 * 
 * 주의사항:
 * - cn 함수는 중복 클래스 제거 및 우선순위 관리
 * - 단축 ID는 충돌 가능성이 있으므로 고유성 보장 필요
 * - UUID 패턴 매칭은 대소문자 구분 없이 처리
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// UUID를 8자리 단축 ID로 변환 (하이픈 제거 후 첫 8자리)
export function getShortId(uuid: string): string {
  return uuid.replace(/-/g, '').substring(0, 8);
}

// 8자리 단축 ID로 UUID 패턴 매칭을 위한 LIKE 쿼리 생성
export function getUuidPattern(shortId: string): string {
  return `${shortId.substring(0, 8)}%`;
}
