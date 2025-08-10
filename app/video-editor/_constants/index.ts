// 화면 비율 설정
export const ASPECT_RATIOS = {
  MOBILE: {
    value: '9:16' as const,
    width: 360,
    height: 640,
    displayRatio: '9 / 16',
    label: 'Mobile (9:16)',
    description: 'Instagram Stories, TikTok'
  },
  SQUARE: {
    value: '1:1' as const,
    width: 640,
    height: 640,
    displayRatio: '1 / 1',
    label: 'Square (1:1)',
    description: 'Instagram Post'
  },
  WIDE: {
    value: '16:9' as const,
    width: 640,
    height: 360,
    displayRatio: '16 / 9',
    label: 'Wide (16:9)',
    description: 'YouTube, Web'
  }
} as const;

export type AspectRatioType = keyof typeof ASPECT_RATIOS;
export type AspectRatioValue = typeof ASPECT_RATIOS[AspectRatioType]['value'];

// 타임라인 설정
export const TIMELINE_CONFIG = {
  DEFAULT_HEIGHT: 300,
  MIN_HEIGHT: 150,
  MAX_HEIGHT: 300,
  PIXELS_PER_SECOND: 40,
  FPS: 30
} as const;

// 캐러셀 설정
export const CAROUSEL_CONFIG = {
  ITEM_WIDTH: 350,
  ITEM_HEIGHT: 400,
  ITEM_GAP: 20
} as const;

// 스타일 설정
export const STYLES = {
  PRIMARY_COLOR: '#38f47cf9',
  BORDER_COLOR: '#ef4444',
  BACKGROUND_COLOR: '#111'
} as const;