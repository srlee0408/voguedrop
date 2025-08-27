/**
 * useTranslation - 다국어 번역 훅
 * 
 * 주요 역할:
 * 1. 영어 로케일 파일에서 번역 텍스트 조회
 * 2. 점 표기법(dot notation)으로 중첩된 번역 키 접근
 * 3. 번역 키가 존재하지 않을 경우 키 자체 반환
 * 4. 타입 안전성을 위한 DeepKeys 타입 지원(주석 처리됨)
 * 
 * 핵심 특징:
 * - 중첩된 JSON 구조를 점 표기법으로 접근 (예: 'common.buttons.save')
 * - 존재하지 않는 키에 대해 graceful fallback
 * - 클라이언트 사이드 전용 훅
 * - 현재 영어만 지원하지만 확장 가능한 구조
 * 
 * 주의사항:
 * - 현재 영어(en) 로케일만 지원
 * - 번역 키 타입 체크는 주석 처리된 상태
 * - 런타임에서만 번역 키 유효성 검증
 * - 번역 파일 로딩 실패 시 키 자체가 반환됨
 */
'use client';

import en from '@/locales/en.json';

// type DeepKeys<T> = T extends object
//   ? {
//       [K in keyof T]: K extends string
//         ? T[K] extends object
//           ? `${K}.${DeepKeys<T[K]>}` | K
//           : K
//         : never;
//     }[keyof T]
//   : never;

// type TranslationKeys = DeepKeys<typeof en>;

export function useTranslation() {
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: unknown = en;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return { t };
}