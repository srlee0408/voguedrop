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