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
