// 텍스트 에디터와 Remotion 렌더링 간 일관성을 위한 공통 상수

// 텍스트 스타일 기본값
export const TEXT_DEFAULTS = {
  fontSize: 48, // 기본 폰트 크기 (px) - 호환성을 위해 유지
  fontSizeRatio: 0.044, // 컨테이너 너비의 4.4% (1080px에서 48px)
  fontFamily: 'sans-serif',
  fontWeight: 700, // 숫자로 통일 (bold = 700)
  color: 'white',
  maxWidthRatio: 0.8, // 컨테이너 너비의 80%
} as const;

// 텍스트 박스 패딩 (배경색이 있을 때만 적용)
export const TEXT_PADDING = {
  horizontal: 30, // 좌우 패딩 (px) - 호환성을 위해 유지
  vertical: 20,   // 상하 패딩 (px) - 호환성을 위해 유지
  horizontalRatio: 0.028, // 컨테이너 너비의 2.8% (1080px에서 30px)
  verticalRatio: 0.010,   // 컨테이너 높이의 1% (1920px에서 20px)
} as const;

// 위치 프리셋 값 (퍼센트)
export const TEXT_POSITION_PRESETS = {
  vertical: {
    top: 15,
    middle: 50,
    bottom: 85,
  },
  horizontal: {
    left: 10,
    center: 50,
    right: 90,
  },
} as const;

// 애니메이션 설정
export const TEXT_ANIMATION = {
  borderRadius: 8, // 텍스트 박스 모서리 둥글기 (px)
  lineHeight: 1.2,
} as const;

// 타임라인 설정
export const TIMELINE_CONFIG = {
  pixelsPerSecond: 40, // 40px = 1초
  fps: 30,             // 초당 프레임 수
} as const;

// 픽셀을 프레임으로 변환
export const pxToFrames = (px: number): number => {
  const seconds = px / TIMELINE_CONFIG.pixelsPerSecond;
  return Math.round(seconds * TIMELINE_CONFIG.fps);
};

// 프레임을 픽셀로 변환
export const framesToPx = (frames: number): number => {
  const seconds = frames / TIMELINE_CONFIG.fps;
  return Math.round(seconds * TIMELINE_CONFIG.pixelsPerSecond);
};

// 폰트 크기 프리셋 (비율 기반)
export const FONT_SIZE_PRESETS = {
  small: {
    label: 'Small',
    ratio: 0.033, // 컨테이너 너비의 3.3% (1080px에서 36px)
  },
  medium: {
    label: 'Medium',
    ratio: 0.044, // 컨테이너 너비의 4.4% (1080px에서 48px)
  },
  large: {
    label: 'Large',
    ratio: 0.066, // 컨테이너 너비의 6.6% (1080px에서 72px)
  },
  xlarge: {
    label: 'Extra Large',
    ratio: 0.088, // 컨테이너 너비의 8.8% (1080px에서 96px)
  },
} as const;

// 비율을 실제 픽셀로 변환
export const ratioToPixels = (ratio: number, containerSize: number): number => {
  return Math.round(ratio * containerSize);
};

// 픽셀을 비율로 변환
export const pixelsToRatio = (pixels: number, containerSize: number): number => {
  return pixels / containerSize;
};