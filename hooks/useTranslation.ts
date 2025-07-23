'use client';

import ko from '@/locales/ko.json';

type DeepKeys<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${DeepKeys<T[K]>}` | K
          : K
        : never;
    }[keyof T]
  : never;

type TranslationKeys = DeepKeys<typeof ko>;

export function useTranslation() {
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = ko;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return { t };
}